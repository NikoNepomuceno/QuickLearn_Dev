const crypto = require('crypto');

/**
 * Generate a SHA-256 hash of file buffer to use as cache key
 * @param {Buffer} buffer - File buffer
 * @returns {string} - Hex hash string
 */
function computeFileHash(buffer) {
    if (!Buffer.isBuffer(buffer)) {
        throw new Error('Expected Buffer for file hashing');
    }
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Compute hash for multiple files (concatenated)
 * @param {Array<Buffer>} buffers - Array of file buffers
 * @returns {string} - Combined hash
 */
function computeMultiFileHash(buffers) {
    if (!Array.isArray(buffers) || buffers.length === 0) {
        throw new Error('Expected non-empty array of buffers');
    }
    const combined = Buffer.concat(buffers);
    return computeFileHash(combined);
}

module.exports = {
    computeFileHash,
    computeMultiFileHash
};

