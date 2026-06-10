CREATE TABLE `monthlyFinancialSummary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodId` int NOT NULL,
	`totalRevenue` decimal(12,2) NOT NULL DEFAULT '0',
	`totalExpenses` decimal(12,2) NOT NULL DEFAULT '0',
	`totalInvestments` decimal(12,2) NOT NULL DEFAULT '0',
	`creditCardPending` decimal(12,2) NOT NULL DEFAULT '0',
	`netProfit` decimal(12,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthlyFinancialSummary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthlyPeriods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`startDate` bigint NOT NULL,
	`endDate` bigint NOT NULL,
	`periodStatus` enum('active','closed','archived') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthlyPeriods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `monthlyFinancialSummary` ADD CONSTRAINT `monthlyFinancialSummary_periodId_monthlyPeriods_id_fk` FOREIGN KEY (`periodId`) REFERENCES `monthlyPeriods`(`id`) ON DELETE cascade ON UPDATE no action;