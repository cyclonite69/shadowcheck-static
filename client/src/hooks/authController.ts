/*
 * authController: bridge for non-React code to trigger auth actions from the
 * AuthProvider. AuthProvider calls setLogout() to register its logout handler.
 */

type LogoutFn = () => Promise<void>;

class AuthController {
  private _logout: LogoutFn = async () => Promise.resolve();

  setLogout(fn: LogoutFn) {
    this._logout = fn;
  }

  async logout() {
    return this._logout();
  }
}

export const authController = new AuthController();
export default authController;
