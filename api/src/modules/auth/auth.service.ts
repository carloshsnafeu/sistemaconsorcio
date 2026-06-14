import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/http";
import { comparePassword } from "../../utils/password";
import { signToken } from "../../utils/jwt";

export class AuthService {
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.active) {
      throw new AppError(401, "Credenciais inválidas.");
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError(401, "Credenciais inválidas.");
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    return {
      token: signToken(publicUser),
      user: publicUser
    };
  }

  static async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true }
    });

    if (!user || !user.active) {
      throw new AppError(401, "Usuário não encontrado ou inativo.");
    }

    return user;
  }
}
