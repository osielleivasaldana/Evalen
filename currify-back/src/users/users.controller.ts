import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/company')
  updateCompany(@Body() body: { companyName: string }, @Request() req: any) {
    return this.usersService.updateCompany(req.user.id, body.companyName);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'RECRUITER')
  create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    return this.usersService.create(createUserDto, req.user.id);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'RECRUITER')
  findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.company);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'RECRUITER')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'RECRUITER')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: any) {
    return this.usersService.update(id, updateUserDto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN', 'RECRUITER')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.usersService.remove(id, req.user.id);
  }

  @Get('by-company/:company')
  @Roles('OWNER', 'ADMIN', 'RECRUITER')
  findByCompany(@Param('company') company: string) {
    return this.usersService.findByCompany(company);
  }
}
