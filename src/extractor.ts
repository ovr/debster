import * as tarStream from 'tar-stream';
import * as path from "path";
import * as fs from "fs";
import readChunk from "read-chunk";
import * as fileType from "file-type";
import * as unstreamZip from "unzip-stream";
import * as simdjson from 'simdjson';
import split = require('split');

export class ExtractorResolver {
  public static async resolveFile(resolvedPath: string, fileName: string): Promise<FileReader> {
    if (fileName.endsWith('.json')) {
      return new PlainFileReader(
        new JsonRowExtractor(),
        path.join(resolvedPath, fileName),
      );
    }

    const buffer = readChunk.sync(path.join(resolvedPath, fileName), 0, 262);
    const fileTypeResult = await fileType.fromBuffer(buffer);
    if (fileTypeResult) {
      switch (fileTypeResult.mime) {
        case "application/gzip":
          return new TarFileReader(
            new JsonRowExtractor(),
            path.join(resolvedPath, fileName),
          );
        default:
          throw new Error(
            `Unsupported content-type "${fileTypeResult.mime}" from file "${fileName}"`
          )
      }
    }

    throw new Error(
      `Unable to detect file type for "${fileName}"`
    );
  }
}

interface FileReader {
  stream(fn: ((item: object) => void)): Promise<void>;
}

export class PlainFileReader implements FileReader {
  public constructor(
    protected readonly rowExtractor: RowExtractor,
    protected filePath: string,
  ) {
  }

  public stream = (fn: ((item: object) => void)) => new Promise<void>((resolve) => {
    fs.createReadStream(this.filePath)
      .pipe(split())
      .on('data', function (entry) {
        try {
          fn(simdjson.parse(entry.toString()));
        } catch (e) {

        }
      })
      .on('end', () => {
        resolve();
      })
    ;
  });
}

export class TarFileReader implements FileReader {
  public constructor(
    protected readonly rowExtractor: RowExtractor,
    protected filePath: string,
  ) {
  }

  public async stream() {
    const fileStream = fs.createReadStream(this.filePath);
    fileStream.pipe(unstreamZip.Parse())
      .on('entry', function (entry) {
        console.log(entry);
      });
  }
}

interface RowExtractor {

}

export class JsonRowExtractor implements RowExtractor {

}
