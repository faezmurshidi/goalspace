import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "../helpers/supabase";

let alice: TestUser;
let bob: TestUser;
let aliceProjectId: string;
let aliceEntryId: string;
let aliceWorkItemId: string;
let aliceDocumentId: string;

beforeAll(async () => {
  const stamp = Date.now();
  alice = await createTestUser(`alice-${stamp}@example.test`);
  bob = await createTestUser(`bob-${stamp}@example.test`);

  const { data: project, error } = await alice.client
    .from("projects")
    .insert({
      owner_id: alice.id,
      slug: "ev-bike",
      title: "Custom EV bike",
      kind: "build",
    })
    .select()
    .single();
  if (error) throw error;
  aliceProjectId = project.id;

  const { data: entry } = await alice.client
    .from("entries")
    .insert({
      project_id: aliceProjectId,
      owner_id: alice.id,
      kind: "decision",
      title: "18650 over 21700",
      body: "Sourcing lead time 6 weeks vs 14.",
    })
    .select()
    .single();
  aliceEntryId = entry!.id;

  const { data: item } = await alice.client
    .from("work_items")
    .insert({
      project_id: aliceProjectId,
      owner_id: alice.id,
      title: "Design BMS",
    })
    .select()
    .single();
  aliceWorkItemId = item!.id;

  const { data: doc } = await alice.client
    .from("documents")
    .insert({
      project_id: aliceProjectId,
      owner_id: alice.id,
      title: "Frame geometry spec",
      body: "v1",
    })
    .select()
    .single();
  aliceDocumentId = doc!.id;
});

afterAll(async () => {
  await deleteTestUser(alice.id);
  await deleteTestUser(bob.id);
});

describe("owner can reach their own rows", () => {
  it("reads their project", async () => {
    const { data } = await alice.client
      .from("projects")
      .select("id")
      .eq("id", aliceProjectId);
    expect(data).toHaveLength(1);
  });
});

describe("a second user is fully isolated", () => {
  it("cannot read the project", async () => {
    const { data } = await bob.client
      .from("projects")
      .select("id")
      .eq("id", aliceProjectId);
    expect(data).toEqual([]);
  });

  it("cannot read entries", async () => {
    const { data } = await bob.client
      .from("entries")
      .select("id")
      .eq("id", aliceEntryId);
    expect(data).toEqual([]);
  });

  it("cannot read work items", async () => {
    const { data } = await bob.client
      .from("work_items")
      .select("id")
      .eq("id", aliceWorkItemId);
    expect(data).toEqual([]);
  });

  it("cannot read documents", async () => {
    const { data } = await bob.client
      .from("documents")
      .select("id")
      .eq("id", aliceDocumentId);
    expect(data).toEqual([]);
  });

  it("cannot update the project", async () => {
    await bob.client
      .from("projects")
      .update({ title: "hijacked" })
      .eq("id", aliceProjectId);

    const { data } = await alice.client
      .from("projects")
      .select("title")
      .eq("id", aliceProjectId)
      .single();
    expect(data!.title).toBe("Custom EV bike");
  });

  it("cannot delete the project", async () => {
    await bob.client.from("projects").delete().eq("id", aliceProjectId);

    const { data } = await alice.client
      .from("projects")
      .select("id")
      .eq("id", aliceProjectId);
    expect(data).toHaveLength(1);
  });

  it("cannot insert a row into another user's project", async () => {
    const { error } = await bob.client.from("entries").insert({
      project_id: aliceProjectId,
      owner_id: bob.id,
      kind: "note",
      body: "intrusion",
    });
    expect(error).not.toBeNull();
  });

  it("cannot forge ownership by setting owner_id to the victim", async () => {
    const { error } = await bob.client.from("entries").insert({
      project_id: aliceProjectId,
      owner_id: alice.id,
      kind: "note",
      body: "forged",
    });
    expect(error).not.toBeNull();
  });
});
