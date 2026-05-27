import { Request, Response, NextFunction } from 'express'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateUUID(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = req.params[paramName]
    if (!value || !UUID_REGEX.test(value)) {
      return res.status(400).json({ error: `Invalid ${paramName}: must be a valid UUID` })
    }
    next()
  }
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}