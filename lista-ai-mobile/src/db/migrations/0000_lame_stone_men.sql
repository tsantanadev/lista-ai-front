CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`remote_id` integer,
	`list_id` integer NOT NULL,
	`description` text NOT NULL,
	`checked` integer DEFAULT false NOT NULL,
	`quantity` text,
	`price` real,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`list_id`) REFERENCES `lists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`remote_id` integer,
	`name` text NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`operation` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
