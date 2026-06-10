CREATE TABLE `productionTracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`year` int NOT NULL,
	`month` int NOT NULL,
	`videosProduced` int NOT NULL DEFAULT 0,
	`imagesProduced` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `productionTracking_id` PRIMARY KEY(`id`)
);
