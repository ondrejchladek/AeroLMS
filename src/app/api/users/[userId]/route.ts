import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/types/roles';
import bcrypt from 'bcryptjs';

interface Props {
  params: Promise<{
    userId: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    // Ověření přihlášení a admin práv
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Kontrola admin práv pomocí role
    if (!isAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.userId);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Získat data z požadavku
    const data = await request.json();

    // Připravit data pro aktualizaci
    const updateData: any = {};

    // Zpracovat všechny předané hodnoty
    for (const [key, value] of Object.entries(data)) {
      // DatumPristi fields are computed by database, skip them
      if (key.includes('DatumPristi')) {
        continue; // Skip computed fields
      }

      // Pokud je hodnota datum, převést na Date objekt
      if (key.includes('Datum') && value) {
        updateData[key] = new Date(value as string);
      } else if (key === 'password' && value && typeof value === 'string' && value.trim() !== '') {
        // Hash hesla pomocí bcrypt
        const hashedPassword = await bcrypt.hash(value, 10);
        updateData[key] = hashedPassword;
      } else {
        updateData[key] = value;
      }
    }

    // Aktualizovat uživatele
    const updatedUser = await prisma.user.update({
      where: {
        id: userId
      },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      user: updatedUser,
      message: 'Uživatel úspěšně aktualizován'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Uživatel nenalezen' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}