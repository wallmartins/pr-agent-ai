import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsObject, IsString } from 'class-validator';

class JiraIssueFieldsDto {
  @ApiProperty()
  summary: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  created: string;

  @ApiProperty()
  updated: string;

  @ApiProperty()
  description: string;
}

class JiraIssueDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  key: string;

  @ApiProperty({ type: JiraIssueFieldsDto })
  fields: JiraIssueFieldsDto;
}

export class GetUserIssuesDto {
  @ApiProperty()
  total: number;

  @ApiProperty({ type: [JiraIssueDto] })
  issues: JiraIssueDto[];
}

export class GetUserIssuesQueryDto {
  @ApiProperty({
    description: 'The email of the Jira user',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class GetIssues {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsObject()
  fields: {
    summary: string;
    status: string;
    created: string;
    updated: string;
    description: string;
  };
}
