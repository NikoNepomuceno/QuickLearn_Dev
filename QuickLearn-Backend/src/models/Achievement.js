const { getPool } = require('../config/db');

class Achievement {
    constructor(data) {
        this.id = data.id;
        this.code = data.code;
        this.name = data.name;
        this.description = data.description;
        this.icon = data.icon;
        this.category = data.category;
        this.rarity = data.rarity;
        this.points = data.points || 0;
        this.lottieUrl = data.lottie_url;
        this.createdAt = data.created_at;
    }

    static async findByCode(code) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM achievements WHERE code = ?',
            [code]
        );
        
        if (rows.length === 0) return null;
        return new Achievement(rows[0]);
    }

    static async findAll() {
        const pool = await getPool();
        const [rows] = await pool.execute('SELECT * FROM achievements ORDER BY id');
        return rows.map(row => new Achievement(row));
    }

    static async findById(id) {
        const pool = await getPool();
        const [rows] = await pool.execute(
            'SELECT * FROM achievements WHERE id = ?',
            [id]
        );
        
        if (rows.length === 0) return null;
        return new Achievement(rows[0]);
    }

    toJSON() {
        return {
            id: this.id,
            code: this.code,
            name: this.name,
            description: this.description,
            icon: this.icon,
            category: this.category,
            rarity: this.rarity,
            points: this.points,
            lottieUrl: this.lottieUrl,
            createdAt: this.createdAt
        };
    }
}

module.exports = Achievement;

