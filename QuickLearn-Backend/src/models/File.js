const { getPool } = require('../config/db');
const { configureCloudinary } = require('../config/cloudinary');

class File {
    constructor(data) {
        this.id = data.id;
        this.userId = data.user_id;
        this.publicId = data.public_id;
        this.resourceType = data.resource_type;
        this.format = data.format;
        this.url = data.url;
        this.secureUrl = data.secure_url;
        this.bytes = data.bytes;
        this.width = data.width;
        this.height = data.height;
        this.folder = data.folder;
        this.originalFilename = data.original_filename;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    static async uploadToCloudinary(fileBuffer, originalFilename, userId, options = {}) {
        const cloudinary = configureCloudinary();
        
        // Determine file type and folder
        const fileExtension = originalFilename.split('.').pop().toLowerCase();
        const folder = `quicklearn/users/${userId}/documents`;
        
        // Configure upload options; let Cloudinary derive a safe public_id from filename
        const uploadOptions = {
            folder: folder,
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true,
            overwrite: false,
            ...options
        };

        // Add compression settings based on file type
        if (['pdf'].includes(fileExtension)) {
            uploadOptions.flags = 'attachment'; // For PDFs, treat as attachment
            uploadOptions.quality = 'auto:good'; // Optimize quality vs size
        } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
            uploadOptions.quality = 'auto:good';
            uploadOptions.fetch_format = 'auto';
            uploadOptions.flags = 'progressive';
        }

        return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary upload error:', error);
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            ).end(fileBuffer);
        });
    }

    static async create(fileData) {
        const pool = await getPool();
        
        const [result] = await pool.execute(
            `INSERT INTO files (
                user_id, public_id, resource_type, format, url, secure_url,
                bytes, width, height, folder, original_filename
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                fileData.userId || null,
                fileData.publicId || null,
                fileData.resourceType || 'raw',
                fileData.format || null,
                fileData.url || null,
                fileData.secureUrl || null,
                fileData.bytes || null,
                fileData.width || null,
                fileData.height || null,
                fileData.folder || null,
                fileData.originalFilename || null
            ]
        );

        return await File.findById(result.insertId);
    }

    static async findById(id) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM files WHERE id = ?',
            [id]
        );
        
        if (rows.length === 0) return null;
        return new File(rows[0]);
    }

    static async findByPublicId(publicId) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM files WHERE public_id = ?',
            [publicId]
        );
        
        if (rows.length === 0) return null;
        return new File(rows[0]);
    }

    static async findByUserId(userId, limit = 50, offset = 0) {
        const pool = await getPool();
        const limitInt = Math.max(1, Math.floor(Number(limit) || 50));
        const offsetInt = Math.max(0, Math.floor(Number(offset) || 0));
        const [rows] = await pool.execute(
            `SELECT * FROM files 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [userId, limitInt, offsetInt]
        );
        
        return rows.map(row => new File(row));
    }

    static async uploadAndSave(fileBuffer, originalFilename, userId, options = {}) {
        try {
            // Upload to Cloudinary
            const cloudinaryResult = await File.uploadToCloudinary(
                fileBuffer, 
                originalFilename, 
                userId, 
                options
            );

            // Save metadata to database
            const fileData = {
                userId: userId,
                publicId: cloudinaryResult.public_id || null,
                resourceType: cloudinaryResult.resource_type || 'raw',
                format: cloudinaryResult.format || null,
                url: cloudinaryResult.url || null,
                secureUrl: cloudinaryResult.secure_url || null,
                bytes: cloudinaryResult.bytes || null,
                width: cloudinaryResult.width || null,
                height: cloudinaryResult.height || null,
                folder: cloudinaryResult.folder || null,
                originalFilename: originalFilename || null
            };

            const file = await File.create(fileData);
            return {
                file: file,
                cloudinaryResult: cloudinaryResult
            };
        } catch (error) {
            console.error('Error uploading and saving file:', error);
            throw error;
        }
    }

    async delete() {
        const cloudinary = configureCloudinary();
        const pool = await getPool();
        
        try {
            // Delete from Cloudinary
            await cloudinary.uploader.destroy(this.publicId);
            
            // Delete from database
            await pool.execute(
                'DELETE FROM files WHERE id = ?',
                [this.id]
            );
            
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            throw error;
        }
    }

    static async delete(id, userId) {
        const file = await File.findById(id);
        if (!file || Number(file.userId) !== Number(userId)) {
            return false;
        }
        
        return await file.delete();
    }

    toJSON() {
        return {
            id: this.id,
            publicId: this.publicId,
            resourceType: this.resourceType,
            format: this.format,
            url: this.url,
            secureUrl: this.secureUrl,
            bytes: this.bytes,
            width: this.width,
            height: this.height,
            folder: this.folder,
            originalFilename: this.originalFilename,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    getFormattedSize() {
        if (!this.bytes) return 'Unknown size';
        
        const sizes = ['B', 'KB', 'MB', 'GB'];
        let size = this.bytes;
        let sizeIndex = 0;
        
        while (size >= 1024 && sizeIndex < sizes.length - 1) {
            size /= 1024;
            sizeIndex++;
        }
        
        return `${size.toFixed(1)} ${sizes[sizeIndex]}`;
    }
}

module.exports = File;
