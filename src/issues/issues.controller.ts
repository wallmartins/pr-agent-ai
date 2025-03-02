import {
  Controller,
  Get,
  UsePipes,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { IssuesService } from './issues.service';
import { GetUserIssuesDto, GetUserIssuesQueryDto } from './dto/get-issue.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @ApiTags('Issues')
  @ApiBearerAuth()
  @Get('user')
  async getUserIssues(@Query() query: GetUserIssuesQueryDto) {
    return this.issuesService.getUserIssues(query.email);
  }
}
