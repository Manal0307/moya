import { readdir, open } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const referencePattern = /^STL-[a-f0-9-]{36}$/;
const failure = (status, message) =>
  Object.assign(new Error(message), { status });
export function createInquiries(dataDir) {
  const directory = resolve(dataDir, "inquiries");
  async function get(reference) {
    if (!referencePattern.test(reference))
      throw failure(404, "Message not found.");
    let handle;
    try {
      handle = await open(
        resolve(directory, `${reference}.json`),
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      const info = await handle.stat();
      if (!info.isFile() || info.size > 65536)
        throw failure(404, "Message not found.");
      const input = JSON.parse(await handle.readFile("utf8"));
      if (
        input.reference !== reference ||
        !Number.isFinite(Date.parse(input.createdAt)) ||
        typeof input.name !== "string" ||
        input.name.length > 120 ||
        typeof input.email !== "string" ||
        input.email.length > 254 ||
        !/^\S+@\S+\.\S+$/.test(input.email) ||
        typeof input.subject !== "string" ||
        input.subject.length > 100 ||
        typeof input.message !== "string" ||
        input.message.length > 5000
      )
        throw failure(404, "Message not found.");
      return {
        reference,
        createdAt: input.createdAt,
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
      };
    } catch (err) {
      if (["ENOENT", "ELOOP"].includes(err.code) || err instanceof SyntaxError)
        throw failure(404, "Message not found.");
      throw err;
    } finally {
      await handle?.close();
    }
  }
  async function list(page = "1") {
    if (!/^[1-9]\d{0,5}$/.test(page)) throw failure(400, "Invalid page.");
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (err) {
      if (err.code === "ENOENT")
        return { messages: [], page: Number(page), total: 0 };
      throw err;
    }
    const names = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".json") &&
          referencePattern.test(entry.name.slice(0, -5)),
      )
      .map((entry) => entry.name.slice(0, -5))
      .sort();
    const messages = [];
    for (const name of names.slice(
      (Number(page) - 1) * 50,
      Number(page) * 50,
    )) {
      try {
        const { message, ...summary } = await get(name);
        messages.push(summary);
      } catch (err) {
        if (err.status !== 404) throw err;
      }
    }
    return { messages, page: Number(page), total: names.length };
  }
  return { get, list };
}
