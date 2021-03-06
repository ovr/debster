import {Command, flags} from '@oclif/command'
import * as path from "path";
import * as fs from "fs";
import {ExtractorResolver} from "./extractor";

class Debster extends Command {
  static description = 'describe the command here'

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
  }

  static args = [{
    name: 'path',
    required: true,
    description: 'path to file or directory',
  }]

  protected async resolvePath(resolvePath: string) {
    const resolvedPath = path.resolve(resolvePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error('Path is not correct');
    }

    const pathSubject = fs.statSync(resolvedPath);
    if (pathSubject.isDirectory()) {
      const files = fs.readdirSync(resolvedPath);
      const result: any[] = [];

      for (const file of files) {
        if (file.startsWith('.')) {
          continue;
        }

        const fileStats = fs.statSync(
          path.join(resolvedPath, file)
        );

        result.push(
          await ExtractorResolver.resolveFile(
            resolvedPath,
            file
          )
        );
      }

      return result;
    }

    if (pathSubject.isFile()) {
      return [
        await ExtractorResolver.resolveFile(
          path.dirname(resolvedPath),
          path.basename(resolvedPath)
        )
      ];
    }

    throw new Error('Unsupported path (you must specify file or directory).');
  }

  async run() {
    const {args, flags} = this.parse(Debster);

    const fileExtractors = await this.resolvePath(args.path);

    const awaitReaders = [];

    for (const fileExtractor of fileExtractors) {
      awaitReaders.push(
        fileExtractor.stream(
          (item: object) => {
            console.log(item);
          }
        )
      );
    }

    await Promise.all(awaitReaders);
  }
}

export = Debster
