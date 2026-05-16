import { Hono } from "hono";
import { s3Service, type CreateS3BucketInput } from "../services/s3";

const app = new Hono();

app.get("/buckets", async (c) => {
  return c.json(await s3Service.listBuckets());
});

app.post("/buckets", async (c) => {
  const input = await c.req.json<CreateS3BucketInput>();
  await s3Service.createBucket(input);
  return c.json({ ok: true });
});

app.delete("/:bucket", async (c) => {
  await s3Service.deleteBucket(c.req.param("bucket"));
  return c.json({ ok: true });
});

app.get("/:bucket/objects", async (c) => {
  return c.json(
    await s3Service.listObjects(c.req.param("bucket"), c.req.query("prefix")),
  );
});

app.put("/:bucket/object", async (c) => {
  await s3Service.putObject({
    bucket: c.req.param("bucket"),
    key: c.req.query("key") ?? "",
    body: await c.req.arrayBuffer(),
    contentType: c.req.header("content-type") || "application/octet-stream",
  });
  return c.json({ ok: true });
});

app.delete("/:bucket/object", async (c) => {
  await s3Service.deleteObject(
    c.req.param("bucket"),
    c.req.query("key") ?? "",
  );
  return c.json({ ok: true });
});

app.post("/:bucket/objects/delete", async (c) => {
  const { keys } = await c.req.json<{ keys: string[] }>();
  await s3Service.deleteObjects(c.req.param("bucket"), keys);
  return c.json({ ok: true });
});

app.get("/:bucket/object/download", async (c) => {
  const key = c.req.query("key") ?? "";
  const res = await s3Service.getObject(c.req.param("bucket"), key);
  const headers: Record<string, string> = {};

  if (res.ContentType) headers["content-type"] = res.ContentType;
  if (res.ContentLength) headers["content-length"] = String(res.ContentLength);
  if (res.ETag) headers["etag"] = res.ETag;

  const filename = key.split("/").pop() ?? key;
  headers["content-disposition"] = `attachment; filename="${filename}"`;

  return new Response(res.Body as ReadableStream, { headers });
});

app.get("/:bucket/object/metadata", async (c) => {
  return c.json(
    await s3Service.getObjectMetadata(
      c.req.param("bucket"),
      c.req.query("key") ?? "",
    ),
  );
});

app.get("/:bucket/object/tags", async (c) => {
  return c.json(
    await s3Service.getObjectTags(
      c.req.param("bucket"),
      c.req.query("key") ?? "",
    ),
  );
});

app.put("/:bucket/object/tags", async (c) => {
  const { key, tags } = await c.req.json<{
    key: string;
    tags: Array<{ key: string; value: string }>;
  }>();
  await s3Service.putObjectTags(c.req.param("bucket"), key, tags);
  return c.json({ ok: true });
});

app.get("/:bucket/versioning", async (c) => {
  return c.json(await s3Service.getBucketVersioning(c.req.param("bucket")));
});

app.put("/:bucket/versioning", async (c) => {
  const { enabled } = await c.req.json<{ enabled: boolean }>();
  await s3Service.putBucketVersioning(c.req.param("bucket"), enabled);
  return c.json({ ok: true });
});

app.get("/:bucket/tags", async (c) => {
  return c.json(await s3Service.getBucketTags(c.req.param("bucket")));
});

app.put("/:bucket/tags", async (c) => {
  const { tags } = await c.req.json<{
    tags: Array<{ key: string; value: string }>;
  }>();
  await s3Service.putBucketTags(c.req.param("bucket"), tags);
  return c.json({ ok: true });
});

app.post("/copy", async (c) => {
  await s3Service.copyObject(
    await c.req.json<{
      srcBucket: string;
      srcKey: string;
      destBucket: string;
      destKey: string;
    }>(),
  );
  return c.json({ ok: true });
});

export default app;
