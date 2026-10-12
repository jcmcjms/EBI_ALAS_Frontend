export interface LoginRequest {
  userName: string
  password: string
}

export function toLoginRequest(data: {
  username: string
  password: string
}): LoginRequest {
  return { userName: data.username, password: data.password }
}
