CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyName` varchar(255) NOT NULL,
	`contactName` varchar(255) NOT NULL,
	`phone` varchar(50),
	`whatsapp` varchar(50),
	`email` varchar(320),
	`monthlyValue` decimal(12,2) DEFAULT '0',
	`startDate` bigint,
	`status` enum('active','paused','cancelled') NOT NULL DEFAULT 'active',
	`metaAds` boolean NOT NULL DEFAULT false,
	`googleAds` boolean NOT NULL DEFAULT false,
	`socialMedia` boolean NOT NULL DEFAULT false,
	`videoQuantity` int DEFAULT 0,
	`imageQuantity` int DEFAULT 0,
	`otherServices` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`role` varchar(255) NOT NULL,
	`phone` varchar(50),
	`email` varchar(320),
	`type` enum('freelancer','fixed') NOT NULL DEFAULT 'fixed',
	`monthlyCost` decimal(12,2) DEFAULT '0',
	`collabStatus` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collaborators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`fileKey` varchar(1000) NOT NULL,
	`url` text NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`docCategory` enum('contract','proposal','report','other') NOT NULL DEFAULT 'other',
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collaboratorId` int,
	`amount` decimal(12,2) NOT NULL,
	`category` varchar(255) NOT NULL,
	`description` varchar(500),
	`date` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`dueDate` bigint NOT NULL,
	`paidDate` bigint,
	`paymentStatus` enum('paid','pending','overdue') NOT NULL DEFAULT 'pending',
	`description` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`taskStatus` enum('todo','in_progress','done') NOT NULL DEFAULT 'todo',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`clientId` int,
	`collaboratorId` int,
	`dueDate` bigint,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
