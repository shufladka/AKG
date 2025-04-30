class UserNotAuthenticatedException extends Error {}
class UserPermissionDeniedException extends Error {}

export {
  UserNotAuthenticatedException,
  UserPermissionDeniedException,
}