import { Stack, StackProps, CfnOutput, Aws, SecretValue } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ddb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as secretsMgr from "aws-cdk-lib/aws-secretsmanager";

export class AwsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const tbl = new ddb.Table(this, 'todos', {
      tableName: 'mulesoft-todos',
      partitionKey: {
        name: 'userID',
        type: ddb.AttributeType.STRING
      },
      sortKey: {
        name: 'created',
        type: ddb.AttributeType.NUMBER
      }
    });

    const todosTblGrp = new iam.Group(this, 'todos-tbl', {
      groupName: 'mulesoft-todos'
    });
    todosTblGrp.addToPolicy(new iam.PolicyStatement({
      actions: ['dynamodb:ListTables'],
      effect: iam.Effect.ALLOW,
      resources: [
        `arn:aws:dynamodb:${Aws.REGION}:${Aws.ACCOUNT_ID}:table/*`
      ]
    }));
    tbl.grantReadWriteData(todosTblGrp);

    const todosUser = new iam.User(this, 'todos-user', {
      groups: [todosTblGrp],
      userName: 'mulesoft-todos-usr'
    });

    const todosAccessKey = new iam.AccessKey(this, 'todos-user-keypair', {
      user: todosUser
    });

    const keyPairSecret = new secretsMgr.Secret(this, 'todos-user-keypair-secret', {
      secretName: 'todos-user-keypair-secret',
      secretObjectValue: {
        'keyID': SecretValue.unsafePlainText(todosAccessKey.accessKeyId),
        'keySecret': SecretValue.unsafePlainText(todosAccessKey.secretAccessKey.toString())
      }
    });
    keyPairSecret.node.addDependency(todosAccessKey);

    new CfnOutput(this, 'todos-keypair-secret-arn', {
      value: keyPairSecret.secretArn
    });
  }
}
