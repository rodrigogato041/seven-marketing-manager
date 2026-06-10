CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`eventType` enum('meeting','delivery','recording','campaign','task','other') NOT NULL DEFAULT 'other',
	`startTime` bigint NOT NULL,
	`endTime` bigint,
	`allDay` boolean NOT NULL DEFAULT false,
	`clientId` int,
	`collaboratorId` int,
	`taskId` int,
	`color` varchar(30),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notifType` enum('payment_due','payment_overdue','task_assigned','task_due','task_overdue','new_client','weekly_summary','general') NOT NULL DEFAULT 'general',
	`notifTitle` varchar(500) NOT NULL,
	`notifMessage` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`link` varchar(500),
	`notifCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
