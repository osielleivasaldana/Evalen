import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  fileName: string;
  filePath: string;
  originalName: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private storageType: 'local' | 'gcs';
  private bucketName: string;
  private gcsClient: Storage | null = null;
  private uploadsDir: string;

  constructor(private configService: ConfigService) {
    this.storageType = this.configService.get<'local' | 'gcs'>('STORAGE_TYPE') || 'local';
    this.bucketName = this.configService.get<string>('GCS_BUCKET_NAME') || '';
    
    this.uploadsDir = path.join(process.cwd(), 'uploads');

    if (this.storageType === 'gcs') {
      if (!this.bucketName) {
        this.logger.error('GCS_BUCKET_NAME is not defined. Falling back to local storage.');
        this.storageType = 'local';
      } else {
        this.gcsClient = new Storage();
        this.logger.log(`Initialized GCS storage for bucket: ${this.bucketName}`);
      }
    } else {
      this.logger.log(`Initialized local storage at ${this.uploadsDir}`);
    }
  }

  async uploadCandidateDocument(
    campaignPublicId: string, 
    file: Express.Multer.File
  ): Promise<UploadResult> {
    const timestamp = Date.now();
    // Clean original name to avoid special characters
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${safeOriginalName}`;
    const destinationPath = `campaigns/${campaignPublicId}/cvs/${fileName}`;

    if (this.storageType === 'gcs' && this.gcsClient) {
      const bucket = this.gcsClient.bucket(this.bucketName);
      const fileGcs = bucket.file(destinationPath);
      
      await fileGcs.save(file.buffer, {
        contentType: file.mimetype,
        resumable: false // Faster for small files
      });
      
      this.logger.log(`Successfully uploaded ${fileName} to GCS bucket ${this.bucketName}`);
      return {
        fileName,
        filePath: `gs://${this.bucketName}/${destinationPath}`, // Internal google storage URI format
        originalName: file.originalname,
      };
    } else {
      // Local storage
      const campaignDir = path.join(this.uploadsDir, 'campaigns', campaignPublicId, 'cvs');
      if (!fs.existsSync(campaignDir)) {
        fs.mkdirSync(campaignDir, { recursive: true });
      }
      const fullLocalPath = path.join(campaignDir, fileName);
      fs.writeFileSync(fullLocalPath, file.buffer);
      
      this.logger.log(`Successfully saved ${fileName} locally to ${fullLocalPath}`);
      return {
        fileName,
        filePath: fullLocalPath,
        originalName: file.originalname,
      };
    }
  }
  
  async getReadStreamAndSize(filePath: string): Promise<{ stream: NodeJS.ReadableStream, size: number }> {
    if (filePath.startsWith('gs://')) {
       if (!this.gcsClient) {
         this.gcsClient = new Storage();
       }
       const match = filePath.match(/^gs:\/\/([^\/]+)\/(.+)$/);
       if (!match) throw new Error("Invalid GCS URI");
       
       const [, bucketName, gcsPath] = match;
       const file = this.gcsClient.bucket(bucketName).file(gcsPath);
       const [metadata] = await file.getMetadata();
       
       return {
         stream: file.createReadStream(),
         size: parseInt((metadata.size as string) || '0', 10)
       };
    } else {
       if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
       const stats = fs.statSync(filePath);
       return {
         stream: fs.createReadStream(filePath),
         size: stats.size
       };
    }
  }
  
  async getFileBuffer(filePath: string): Promise<Buffer> {
      if (filePath.startsWith('gs://')) {
          if (!this.gcsClient) this.gcsClient = new Storage();
          const match = filePath.match(/^gs:\/\/([^\/]+)\/(.+)$/);
          if (!match) throw new Error("Invalid GCS URI");
          
          const [, bucketName, gcsPath] = match;
          const [fileBuffer] = await this.gcsClient.bucket(bucketName).file(gcsPath).download();
          return fileBuffer;
      } else {
          if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
          return fs.readFileSync(filePath);
      }
  }
}
