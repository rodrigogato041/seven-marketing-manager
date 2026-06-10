CREATE TABLE `budgetCalculations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetId` int NOT NULL,
	`forecastedRevenue` decimal(12,2) NOT NULL DEFAULT '0',
	`totalFixedCosts` decimal(12,2) NOT NULL DEFAULT '0',
	`totalVariableCosts` decimal(12,2) NOT NULL DEFAULT '0',
	`totalPersonalExpenses` decimal(12,2) NOT NULL DEFAULT '0',
	`totalCollaboratorCosts` decimal(12,2) NOT NULL DEFAULT '0',
	`totalExpenses` decimal(12,2) NOT NULL DEFAULT '0',
	`netProfitForecast` decimal(12,2) NOT NULL DEFAULT '0',
	`breakEvenPoint` decimal(12,2) NOT NULL DEFAULT '0',
	`safetyMargin` decimal(12,2) NOT NULL DEFAULT '0',
	`profitMarginPercentage` decimal(5,2) NOT NULL DEFAULT '0',
	`budgetStatus` enum('positive','warning','negative') NOT NULL DEFAULT 'positive',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `budgetCalculations_id` PRIMARY KEY(`id`),
	CONSTRAINT `budgetCalculations_budgetId_unique` UNIQUE(`budgetId`)
);
--> statement-breakpoint
CREATE TABLE `fixedCosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetId` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`category` varchar(100) NOT NULL,
	`isRecurring` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fixedCosts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monthlyBudgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`periodId` int NOT NULL,
	`forecastedRevenue` decimal(12,2) NOT NULL DEFAULT '0',
	`profitTarget` decimal(12,2) DEFAULT '0',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthlyBudgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personalExpenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetId` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`category` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `personalExpenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `variableCosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`budgetId` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`category` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `variableCosts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `budgetCalculations` ADD CONSTRAINT `budgetCalculations_budgetId_monthlyBudgets_id_fk` FOREIGN KEY (`budgetId`) REFERENCES `monthlyBudgets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fixedCosts` ADD CONSTRAINT `fixedCosts_budgetId_monthlyBudgets_id_fk` FOREIGN KEY (`budgetId`) REFERENCES `monthlyBudgets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthlyBudgets` ADD CONSTRAINT `monthlyBudgets_periodId_monthlyPeriods_id_fk` FOREIGN KEY (`periodId`) REFERENCES `monthlyPeriods`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `personalExpenses` ADD CONSTRAINT `personalExpenses_budgetId_monthlyBudgets_id_fk` FOREIGN KEY (`budgetId`) REFERENCES `monthlyBudgets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `variableCosts` ADD CONSTRAINT `variableCosts_budgetId_monthlyBudgets_id_fk` FOREIGN KEY (`budgetId`) REFERENCES `monthlyBudgets`(`id`) ON DELETE cascade ON UPDATE no action;