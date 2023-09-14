import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";
import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from "node:crypto";

import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import { prisma } from "../lib/prisma/prisma";

const pump = promisify(pipeline)

export async function uploadVideoRoute (app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, // 25MB
    }
  })

  app.post('/video', async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ error: 'missing file.'});
    }

    const extension = path.extname(data.filename)

    if (extension !== '.mp3') {
      return reply.status(400).send({ error: 'invalid file type. please upload an mp3 file.'});
    }

    const newFileName = `${randomUUID()}${extension}`
    const uploadDestination = path.resolve(__dirname, '../../tmp', newFileName);

    await pump(data.file, fs.createWriteStream(uploadDestination))

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination
      }
    })

    return {
      video
    }
  })
}