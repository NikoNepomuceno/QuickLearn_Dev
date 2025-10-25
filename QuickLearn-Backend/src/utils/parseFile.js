const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const PptxParser = require('node-pptx-parser').default;

function detectFileType(originalName, mimeType) {
	const name = (originalName || '').toLowerCase();
	if (name.endsWith('.txt') || mimeType === 'text/plain') return 'txt';
	if (name.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf';
	if (name.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
	if (name.endsWith('.pptx') || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return 'pptx';
	return 'unknown';
}
	
async function parseTxt(buffer) {
	const text = buffer.toString('utf8');
	return {
		text: text,
		pages: [text], // TXT files are treated as single page
		pageCount: 1
	};
}

async function parsePdf(buffer) {
	const data = await pdfParse(buffer);
	const text = data.text || '';
	
	// Get the actual number of pages from the PDF metadata
	const pageCount = data.numpages || 1;
	
	// If we have page count, try to split the text more intelligently
	let pages = [];
	
	if (pageCount > 1) {
		// Try to split by common page break patterns
		const lines = text.split('\n');
		let currentPage = [];
		let pageIndex = 0;
		
		// Look for page break indicators
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			
			// Check for various page break patterns
			if (line.match(/^\d+$/) && i > 0 && lines[i-1].trim() === '') {
				// Found a standalone page number
				if (currentPage.length > 0) {
					pages.push(currentPage.join('\n').trim());
					currentPage = [];
					pageIndex++;
				}
			} else if (line.match(/^Page \d+/) || line.match(/^\d+\s*$/)) {
				// Another page break pattern
				if (currentPage.length > 0) {
					pages.push(currentPage.join('\n').trim());
					currentPage = [];
					pageIndex++;
				}
			} else if (line.match(/^[A-Z][a-z]+ \d+/) && i > 0) {
				// Pattern like "October 12" or "January 1" - might be a new page
				if (currentPage.length > 0 && currentPage.length > 10) {
					pages.push(currentPage.join('\n').trim());
					currentPage = [];
					pageIndex++;
				}
				currentPage.push(lines[i]);
			} else {
				currentPage.push(lines[i]);
			}
		}
		
		// Add the last page
		if (currentPage.length > 0) {
			pages.push(currentPage.join('\n').trim());
		}
		
		// If we didn't detect enough pages, try a different approach
		if (pages.length < pageCount) {
			// Split text into roughly equal chunks based on page count
			const textLength = text.length;
			const chunkSize = Math.floor(textLength / pageCount);
			pages = [];
			
			for (let i = 0; i < pageCount; i++) {
				const start = i * chunkSize;
				const end = i === pageCount - 1 ? textLength : (i + 1) * chunkSize;
				const pageText = text.substring(start, end).trim();
				if (pageText.length > 0) {
					pages.push(pageText);
				}
			}
		}
	} else {
		// Single page
		pages = [text];
	}
	
	// Filter out empty pages and ensure we have the right number
	const nonEmptyPages = pages.filter(page => page.trim().length > 0);
	
	// If we still don't have enough pages, create them by splitting the text
	if (nonEmptyPages.length < pageCount) {
		const textLength = text.length;
		const chunkSize = Math.floor(textLength / pageCount);
		const finalPages = [];
		
		for (let i = 0; i < pageCount; i++) {
			const start = i * chunkSize;
			const end = i === pageCount - 1 ? textLength : (i + 1) * chunkSize;
			const pageText = text.substring(start, end).trim();
			if (pageText.length > 0) {
				finalPages.push(pageText);
			}
		}
		
		return {
			text: text,
			pages: finalPages,
			pageCount: finalPages.length
		};
	}
	
	return {
		text: text,
		pages: nonEmptyPages,
		pageCount: nonEmptyPages.length
	};
}

async function parseDocx(buffer) {
	const result = await mammoth.extractRawText({ buffer });
	const text = result.value || '';
	
	// For DOCX, we'll try to split by common section breaks
	// This is a heuristic approach
	const pages = [];
	const sections = text.split(/\n\s*\n\s*\n/); // Split by multiple newlines
	
	if (sections.length > 1) {
		pages.push(...sections.filter(section => section.trim().length > 0));
	} else {
		pages.push(text);
	}
	
	return {
		text: text,
		pages: pages,
		pageCount: pages.length
	};
}

async function parsePptx(buffer) {
	try {
		// Create a temporary file path for the parser
		const fs = require('fs');
		const path = require('path');
		const os = require('os');
		
		// Create a temporary file
		const tempDir = os.tmpdir();
		const tempFilePath = path.join(tempDir, `temp_${Date.now()}.pptx`);
		
		// Write buffer to temporary file
		fs.writeFileSync(tempFilePath, buffer);
		
		// Parse the PPTX file
		const parser = new PptxParser(tempFilePath);
		const textContent = await parser.extractText();
		
		// Clean up temporary file
		fs.unlinkSync(tempFilePath);
		
		// Extract text from all slides
		const allText = [];
		const pages = [];
		
		textContent.forEach((slide, index) => {
			const slideText = slide.text.join('\n').trim();
			if (slideText.length > 0) {
				allText.push(slideText);
				pages.push(slideText);
			}
		});
		
		const fullText = allText.join('\n\n');
		
		return {
			text: fullText,
			pages: pages,
			pageCount: pages.length
		};
	} catch (error) {
		console.error('Error parsing PPTX:', error);
		throw new Error('Failed to parse PPTX file: ' + error.message);
	}
}

async function parseUploadedFile(file) {
	const { originalname, mimetype, buffer } = file;
	const type = detectFileType(originalname, mimetype);
	if (type === 'txt') return parseTxt(buffer);
	if (type === 'pdf') return parsePdf(buffer);
	if (type === 'docx') return parseDocx(buffer);
	if (type === 'pptx') return parsePptx(buffer);
	throw new Error('Unsupported file type. Supported: .txt, .pdf, .docx, .pptx');
}

module.exports = { parseUploadedFile };



