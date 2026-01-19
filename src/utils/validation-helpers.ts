import { ZodObject, z, ZodRawShape } from 'zod';

type SchemaInput = {
  body?: ZodRawShape | ZodObject;
  query?: ZodRawShape | ZodObject;
  params?: ZodRawShape | ZodObject;
  headers?: ZodRawShape | ZodObject;
};

interface ValidationSchema {
  body?: ZodObject;
  query?: ZodObject;
  params?: ZodObject;
  headers?: ZodObject;
}

export const createSchema = (schema: SchemaInput): ValidationSchema => {
  const result: ValidationSchema = {};

  if (schema.body) {
    result.body = schema.body instanceof z.ZodObject ? schema.body : z.strictObject(schema.body);
  }

  if (schema.query) {
    result.query = schema.query instanceof z.ZodObject ? schema.query : z.looseObject(schema.query);
  }

  if (schema.params) {
    result.params =
      schema.params instanceof z.ZodObject ? schema.params : z.strictObject(schema.params);
  }

  if (schema.headers) {
    result.headers =
      schema.headers instanceof z.ZodObject ? schema.headers : z.looseObject(schema.headers);
  }

  return result;
};
