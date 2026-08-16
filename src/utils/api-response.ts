import { HTTP_STATUS } from './http-status';
import { ApiMessages } from '@/constants/api-messages';
import { Response } from 'express';

class ApiResponse {
  static success<T>(res: Response, data: T, message: string = ApiMessages.SUCCESS.SUCCESS) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      statusCode: HTTP_STATUS.OK,
      message,
      data,
    });
  }

  static created<T>(res: Response, data: T, message: string = ApiMessages.SUCCESS.CREATED) {
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      statusCode: HTTP_STATUS.CREATED,
      message,
      data,
    });
  }

  static updated<T>(res: Response, data: T, message: string = ApiMessages.SUCCESS.UPDATED) {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      statusCode: HTTP_STATUS.OK,
      message,
      data,
    });
  }

  static deleted(res: Response, message: string = ApiMessages.SUCCESS.DELETED) {
    return res.status(HTTP_STATUS.NO_CONTENT).json({
      success: true,
      statusCode: HTTP_STATUS.NO_CONTENT,
      message,
    });
  }

  static custom<T>(res: Response, statusCode: number, data: T, message: string) {
    return res.status(statusCode).json({
      success: statusCode < 400,
      statusCode,
      message,
      data,
    });
  }
}

export default ApiResponse;
