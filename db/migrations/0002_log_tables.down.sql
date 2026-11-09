-- Reverts 0002. Drops in reverse FK order; indexes and constraints go with their tables.
-- Destroys every library entry, link and list.
DROP TABLE IF EXISTS list_items;
DROP TABLE IF EXISTS lists;
DROP TABLE IF EXISTS entry_links;
DROP TABLE IF EXISTS entries;
