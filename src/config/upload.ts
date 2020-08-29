import path from 'path';
import { randomBytes } from 'crypto';
import multer from 'multer';

export const folder = path.resolve(__dirname, '..', '..', 'tmp');

export default multer({
  storage: multer.diskStorage({
    destination: folder,
    filename(request, file, callback) {
      const hash = randomBytes(10).toString('HEX');
      const [, extension] = file.mimetype.split('/');
      callback(null, `${hash}.${extension}`);
    },
  }),
});
