CREATE TABLE `creditCardTransactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`description` varchar(500) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`category` varchar(255) NOT NULL,
	`transactionDate` bigint NOT NULL,
	`ccStatus` enum('pending','paid') NOT NULL DEFAULT 'pending',
	`paidDate` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creditCardTransactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`investmentType` enum('fixed','variable') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`description` text,
	`date` bigint NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investments_id` PRIMARY KEY(`id`)
);
