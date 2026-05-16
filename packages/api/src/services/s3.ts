import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetBucketTaggingCommand,
  GetBucketVersioningCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutBucketTaggingCommand,
  PutBucketVersioningCommand,
  PutObjectCommand,
  PutObjectTaggingCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { awsClients } from "../aws";

export type S3TagDto = { key: string; value: string };

export type CreateS3BucketInput = {
  name: string;
  tags?: S3TagDto[];
  versioningEnabled?: boolean;
};

export type PutS3ObjectInput = {
  bucket: string;
  key: string;
  body: ArrayBuffer;
  contentType: string;
};

export type CopyS3ObjectInput = {
  srcBucket: string;
  srcKey: string;
  destBucket: string;
  destKey: string;
};

function toS3TagDto(tags?: Array<{ Key?: string; Value?: string }>): S3TagDto[] {
  return (tags ?? []).map((tag) => ({
    key: tag.Key ?? "",
    value: tag.Value ?? "",
  }));
}

function toAwsTagSet(tags: S3TagDto[]) {
  return tags.map((tag) => ({ Key: tag.key, Value: tag.value }));
}

function isNoSuchTagSetError(error: unknown) {
  return error instanceof Error && error.name === "NoSuchTagSet";
}

function toBucketVersioningStatus(status?: string) {
  return status === "Enabled"
    ? "Enabled"
    : status === "Suspended"
      ? "Suspended"
      : "Unversioned";
}

export function createS3Service(client: S3Client = awsClients.s3) {
  async function getBucketTags(bucket: string): Promise<S3TagDto[]> {
    try {
      const res = await client.send(
        new GetBucketTaggingCommand({ Bucket: bucket }),
      );
      return toS3TagDto(res.TagSet);
    } catch (error) {
      if (isNoSuchTagSetError(error)) return [];
      throw error;
    }
  }

  return {
    async listBuckets() {
      const res = await client.send(new ListBucketsCommand({}));
      return Promise.all(
        (res.Buckets ?? []).map(async (bucket) => {
          const name = bucket.Name ?? "";
          return {
            name,
            createdAt: bucket.CreationDate?.toISOString(),
            tags: name ? await getBucketTags(name) : [],
          };
        }),
      );
    },

    async createBucket(input: CreateS3BucketInput) {
      await client.send(new CreateBucketCommand({ Bucket: input.name }));

      if (input.tags?.length) {
        await client.send(
          new PutBucketTaggingCommand({
            Bucket: input.name,
            Tagging: { TagSet: toAwsTagSet(input.tags) },
          }),
        );
      }

      if (input.versioningEnabled !== undefined) {
        await client.send(
          new PutBucketVersioningCommand({
            Bucket: input.name,
            VersioningConfiguration: {
              Status: input.versioningEnabled ? "Enabled" : "Suspended",
            },
          }),
        );
      }
    },

    async deleteBucket(bucket: string) {
      await client.send(new DeleteBucketCommand({ Bucket: bucket }));
    },

    async listObjects(bucket: string, prefix?: string) {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix || undefined,
          Delimiter: "/",
        }),
      );

      return {
        folders: (res.CommonPrefixes ?? []).map((item) => item.Prefix ?? ""),
        files: (res.Contents ?? []).map((object) => ({
          key: object.Key ?? "",
          size: object.Size ?? 0,
          lastModified: object.LastModified?.toISOString(),
          etag: object.ETag?.replace(/"/g, ""),
        })),
      };
    },

    async putObject(input: PutS3ObjectInput) {
      await client.send(
        new PutObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
          Body: new Uint8Array(input.body),
          ContentType: input.contentType,
        }),
      );
    },

    async deleteObject(bucket: string, key: string) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    async deleteObjects(bucket: string, keys: string[]) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: keys.map((key) => ({ Key: key })),
            Quiet: true,
          },
        }),
      );
    },

    async getObject(bucket: string, key: string) {
      return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    },

    async getObjectMetadata(bucket: string, key: string) {
      const res = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );

      return {
        contentType: res.ContentType,
        contentLength: res.ContentLength,
        etag: res.ETag?.replace(/"/g, ""),
        lastModified: res.LastModified?.toISOString(),
        versionId: res.VersionId,
        cacheControl: res.CacheControl,
        contentEncoding: res.ContentEncoding,
        contentDisposition: res.ContentDisposition,
      };
    },

    async getObjectTags(bucket: string, key: string) {
      const res = await client.send(
        new GetObjectTaggingCommand({ Bucket: bucket, Key: key }),
      );
      return toS3TagDto(res.TagSet);
    },

    async putObjectTags(bucket: string, key: string, tags: S3TagDto[]) {
      await client.send(
        new PutObjectTaggingCommand({
          Bucket: bucket,
          Key: key,
          Tagging: { TagSet: toAwsTagSet(tags) },
        }),
      );
    },

    async getBucketVersioning(bucket: string) {
      const res = await client.send(
        new GetBucketVersioningCommand({ Bucket: bucket }),
      );
      return { status: toBucketVersioningStatus(res.Status) };
    },

    async putBucketVersioning(bucket: string, enabled: boolean) {
      await client.send(
        new PutBucketVersioningCommand({
          Bucket: bucket,
          VersioningConfiguration: {
            Status: enabled ? "Enabled" : "Suspended",
          },
        }),
      );
    },

    getBucketTags,

    async putBucketTags(bucket: string, tags: S3TagDto[]) {
      await client.send(
        new PutBucketTaggingCommand({
          Bucket: bucket,
          Tagging: { TagSet: toAwsTagSet(tags) },
        }),
      );
    },

    async copyObject(input: CopyS3ObjectInput) {
      await client.send(
        new CopyObjectCommand({
          Bucket: input.destBucket,
          Key: input.destKey,
          CopySource: `/${input.srcBucket}/${input.srcKey}`,
        }),
      );
    },
  };
}

export const s3Service = createS3Service();
