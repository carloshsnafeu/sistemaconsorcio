import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/http";
import { hashPassword } from "../../utils/password";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active?: boolean;
}

interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  active?: boolean;
}

export class UserService {
  static async list() {
    return prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { createdAt: "desc" }
    });
  }

  static async get(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, select: publicUserSelect });

    if (!user) {
      throw new AppError(404, "Usuário não encontrado.");
    }

    return user;
  }

  static async create(data: CreateUserInput) {
    const passwordHash = await hashPassword(data.password);

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        active: data.active ?? true
      },
      select: publicUserSelect
    });
  }

  static async update(id: string, data: UpdateUserInput) {
    const updateData: Prisma.UserUpdateInput = {
      name: data.name,
      email: data.email,
      role: data.role,
      active: data.active
    };

    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
    }

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: publicUserSelect
    });
  }
}
