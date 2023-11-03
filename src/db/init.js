const SAMPLE_DATA = `
INSERT INTO messages (user, message, room_id) VALUES ('Dora Militaru', 'Hello everyone!', 1);
`

export const INIT_DB = `
CREATE TABLE messages (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    date_sent DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user VARCHAR(64) NOT NULL,
    message TEXT CHECK (LENGTH("message") <= 1000) NOT NULL,
    room_id INTEGER NOT NULL REFERENCES rooms (id) ON DELETE CASCADE
);

CREATE TABLE rooms (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(64) NOT NULL UNIQUE,
    slug VARCHAR(64) NOT NULL UNIQUE
);

CREATE INDEX messages_date_sent_idx ON messages (date_sent);

INSERT INTO rooms (name, slug) VALUES ('DevOps Barcelona', 'devops-bcn');
` + SAMPLE_DATA

