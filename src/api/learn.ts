import { get, post } from './request'

export interface Course {
  id: number
  title: string
  description: string
  cover: string
  category: string
  video_url: string
  xp_reward: number
  lesson_count: number
}

export interface Lesson {
  id: number
  title: string
  video_url: string
  duration: number
  order: number
}

export interface CourseDetail extends Course {
  lessons: Lesson[]
}

export interface Quiz {
  id: number
  question: string
  options: string[]
  correct: number
  order: number
}

export interface Progress {
  xp: number
  points: number
  streak: number
  total_courses: number
}

export interface CompleteResult {
  xp: number
  xp_gained: number
  achievements: string[]
}

export const learnApi = {
  courses: (category?: string) => get<Course[]>(`/learn/courses${category ? `?category=${category}` : ''}`),
  courseDetail: (id: number) => get<CourseDetail>(`/learn/courses/${id}`),
  lessonQuizzes: (lid: number) => get<Quiz[]>(`/learn/lessons/${lid}/quizzes`),
  completeLesson: (lid: number, userId?: string) =>
    post<CompleteResult>(`/learn/lesson/${lid}/complete`, { user_id: userId || 'anonymous' }),
  progress: (userId?: string) => get<Progress>(`/learn/progress?user_id=${userId || 'anonymous'}`),
  achievements: (userId?: string) => get<{ name: string; unlocked_at: number }[]>(`/learn/achievements?user_id=${userId || 'anonymous'}`),
}