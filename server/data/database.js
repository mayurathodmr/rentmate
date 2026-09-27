const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const dbFile = path.join(__dirname, "rentmate.sqlite");
let db = null;

async function getDatabase() {
    if (db) return db;

    const SQL = await initSqlJs({
        locateFile: file =>
            path.join(
                __dirname,
                "../../node_modules/sql.js/dist",
                file
            )
    });

    if (fs.existsSync(dbFile)) {
        db = new SQL.Database(fs.readFileSync(dbFile));
    } else {
        db = new SQL.Database();
    }

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'USER',
            verified INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS properties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            property_type TEXT NOT NULL,
            bhk TEXT DEFAULT '',
            location TEXT NOT NULL,
            city TEXT NOT NULL,
            area TEXT NOT NULL,
            address TEXT,
            rent INTEGER NOT NULL,
            deposit INTEGER DEFAULT 0,
            maintenance INTEGER DEFAULT 0,
            area_sqft INTEGER DEFAULT 0,
            bathrooms INTEGER DEFAULT 0,
            furnishing TEXT DEFAULT 'Unfurnished',
            available_from TEXT,
            amenities TEXT DEFAULT '',
            tenant_preference TEXT DEFAULT 'Anyone',
            status TEXT NOT NULL DEFAULT 'PENDING',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS property_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            property_id INTEGER NOT NULL,
            image_path TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            property_id INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, property_id)
        );

        CREATE TABLE IF NOT EXISTS enquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            property_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'NEW',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS visit_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            property_id INTEGER NOT NULL,
            visit_date TEXT NOT NULL,
            visit_time TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);

    saveDatabase();
    return db;
}

function saveDatabase() {
    if (!db) return;
    fs.writeFileSync(dbFile, Buffer.from(db.export()));
}

module.exports = {
    getDatabase,
    saveDatabase
};
