import { afterEach, describe, expect, it } from "vitest";
import { createTask, deleteTask, listTasks, updateTask } from "./db";

const createdIds = new Set<number>();

afterEach(async () => {
  for (const task of await listTasks()) {
    if (createdIds.has(task.id) || String(task.title).includes("recurrence-test-")) {
      await deleteTask(task.id);
    }
  }
  createdIds.clear();
});

describe("task recurrence", () => {
  it("creates the next occurrence when a recurring task is completed", async () => {
    const dueDate = new Date(2026, 5, 10, 12, 0, 0, 0).getTime();
    const result = await createTask({
      title: `recurrence-test-${Date.now()}`,
      status: "todo",
      recurrence: "weekly",
      recurrenceEvery: 1,
      dueDate,
    } as any);
    createdIds.add(result.id);

    await updateTask(result.id, { status: "done" } as any);

    const tasks = await listTasks();
    const generated = tasks.find(task => task.recurrenceParentId === result.id);
    if (generated) createdIds.add(generated.id);

    expect(generated).toBeDefined();
    expect(generated?.status).toBe("todo");
    expect(generated?.dueDate).toBe(new Date(2026, 5, 17, 12, 0, 0, 0).getTime());
  });

  it("does not create another occurrence after recurrence end date", async () => {
    const dueDate = new Date(2026, 5, 10, 12, 0, 0, 0).getTime();
    const result = await createTask({
      title: `recurrence-test-ended-${Date.now()}`,
      status: "todo",
      recurrence: "weekly",
      recurrenceEvery: 1,
      recurrenceUntil: new Date(2026, 5, 12, 12, 0, 0, 0).getTime(),
      dueDate,
    } as any);
    createdIds.add(result.id);

    await updateTask(result.id, { status: "done" } as any);

    const tasks = await listTasks();
    const generated = tasks.find(task => task.recurrenceParentId === result.id);

    expect(generated).toBeUndefined();
  });
});
