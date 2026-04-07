PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`remote_id` integer,
	`list_id` integer NOT NULL,
	`description` text NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	`quantity` real,
	`price` real,
	`uom` text,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_items` SELECT `id`, `remote_id`, `list_id`, `description`, `checked`, CAST(`quantity` AS REAL), `price`, NULL, `updated_at`, `deleted_at` FROM `items`;
--> statement-breakpoint
DROP TABLE `items`;
--> statement-breakpoint
ALTER TABLE `__new_items` RENAME TO `items`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
