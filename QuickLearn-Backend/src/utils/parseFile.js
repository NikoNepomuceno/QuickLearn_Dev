const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

function detectFileType(originalName, mimeType) {
	const name = (originalName || '').toLowerCase();
	if (name.endsWith('.txt') || mimeType === 'text/plain') return 'txt';
	if (name.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf';
	if (name.endsWith('.docx') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
	return 'unknown';
}
	
async function parseTxt(buffer) {
	return buffer.toString('utf8');
}

async function parsePdf(buffer) {
	const data = await pdfParse(buffer);
	return data.text || '';
}

async function parseDocx(buffer) {
	const result = await mammoth.extractRawText({ buffer });
	return result.value || '';
}

async function parseUploadedFile(file) {
	const { originalname, mimetype, buffer } = file;
	const type = detectFileType(originalname, mimetype);
	if (type === 'txt') return parseTxt(buffer);
	if (type === 'pdf') return parsePdf(buffer);
	if (type === 'docx') return parseDocx(buffer);
	throw new Error('Unsupported file type. Supported: .txt, .pdf, .docx');
}

module.exports = { parseUploadedFile };



