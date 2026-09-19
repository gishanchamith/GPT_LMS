import type { RequestHandler } from 'express';
import Course from '../models/Course.js';
import ApiError from '../utils/ApiError.js';

const loadCourse: RequestHandler = async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  req.course = course;
  next();
};

export default loadCourse;
