/* Amplify Params - DO NOT EDIT
	API_ADMINQUERIES_APIID
	API_ADMINQUERIES_APINAME
	API_FLEETWATCHERFRONT_GRAPHQLAPIENDPOINTOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIIDOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIKEYOUTPUT
	AUTH_FLEETWATCHERFRONTBF750521_USERPOOLID
	ENV
	FUNCTION_FLEETWATCHERBUSINESSALERTPROSESSOR_NAME
	FUNCTION_FLEETWATCHERCUSTOMACTIONS_NAME
	FUNCTION_FLEETWATCHERFLESPIALERTSPROCESSOR_NAME
	FUNCTION_FLEETWATCHERNOTIFIER_NAME
	FUNCTION_FLEETWATCHERREPORTPROCESSOR_NAME
	REGION
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const { 
  EventBridgeClient, 
  PutRuleCommand, 
  PutTargetsCommand,
  DisableRuleCommand
 } = require("@aws-sdk/client-eventbridge");
 
 const { LambdaClient, AddPermissionCommand } = require("@aws-sdk/client-lambda");
 const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });
 
 const DalService = require("./_dal-service");
 
 const dalService = new DalService();
 const eventBridgeServiceClient = new EventBridgeClient({ region: process.env.AWS_REGION });
 
 const scheduleMaintenanceReminders = async (maintenance) => {
  console.log(maintenance)
  try {
    const alertDate = new Date(maintenance.alertDate);
 
    const ruleBaseName = `maint-${maintenance.id.slice(0, 8)}`;
    const earlyRuleName = `${ruleBaseName}-early`;
    const dayOfRuleName = `${ruleBaseName}-day`;
 
    // Si reminderDays > 0, on crée le rappel anticipé
    if (maintenance.reminderDays > 0) {
      const reminderDate = new Date(alertDate);
      reminderDate.setDate(reminderDate.getDate() - maintenance.reminderDays);
 
      // Early reminder rule
      const earlyRuleResponse = await eventBridgeServiceClient.send(new PutRuleCommand({
        Name: earlyRuleName,
        ScheduleExpression: `cron(0 8 ${reminderDate.getDate()} ${reminderDate.getMonth() + 1} ? ${reminderDate.getFullYear()})`,
        State: 'ENABLED',
        Description: `Rappel anticipé - Véhicule ${maintenance.vehicle.immat}`
      }));
      console.log('Early rule created:', earlyRuleResponse);
 
      const earlyTargetResponse = await eventBridgeServiceClient.send(new PutTargetsCommand({
        Rule: earlyRuleName,
        Targets: [{
          Id: `${earlyRuleName}-tgt`,
          Arn: 'arn:aws:lambda:eu-west-3:851725201946:function:FleetWatcherMaintenanceReminder-fwatcher',
          Input: JSON.stringify({
            maintenanceId: maintenance.id,
            email: maintenance.email,
            reminderData: {
              ...maintenance,
              reminderType: 'EARLY',
              reminderDays: maintenance.reminderDays,
              reminderText: maintenance.reminderDays === 1 ? 'jour' : 'jours'
            }
          })
        }]
      }));
      console.log('Early target set:', earlyTargetResponse);
 
      // Add permission for early reminder
      await lambdaClient.send(new AddPermissionCommand({
        Action: 'lambda:InvokeFunction',
        FunctionName: 'arn:aws:lambda:eu-west-3:851725201946:function:FleetWatcherMaintenanceReminder-fwatcher',
        Principal: 'events.amazonaws.com',
        SourceArn: earlyRuleResponse.RuleArn,
        StatementId: `${earlyRuleName}-invoke`
      }));
    }
 
    // Créer le rappel du jour même
    const dayRuleResponse = await eventBridgeServiceClient.send(new PutRuleCommand({
      Name: dayOfRuleName,
      ScheduleExpression: `cron(0 8 ${alertDate.getDate()} ${alertDate.getMonth() + 1} ? ${alertDate.getFullYear()})`,
      State: 'ENABLED',
      Description: `Rappel du jour - Véhicule ${maintenance.vehicle.immat}`
    }));
    console.log('Day rule created:', dayRuleResponse);
 
    const dayTargetResponse = await eventBridgeServiceClient.send(new PutTargetsCommand({
      Rule: dayOfRuleName,
      Targets: [{
        Id: `${dayOfRuleName}-tgt`,
        Arn: 'arn:aws:lambda:eu-west-3:851725201946:function:FleetWatcherMaintenanceReminder-fwatcher',
        Input: JSON.stringify({
          maintenanceId: maintenance.id,
          email: maintenance.email,
          reminderData: {
            ...maintenance,
            operationName: maintenance.operationName,
            reminderType: 'DAY_OF'
          }
        })
      }]
    }));
    console.log('Day target set:', dayTargetResponse);
 
    // Add permission for day-of reminder
    await lambdaClient.send(new AddPermissionCommand({
      Action: 'lambda:InvokeFunction', 
      FunctionName: 'arn:aws:lambda:eu-west-3:851725201946:function:FleetWatcherMaintenanceReminder-fwatcher',
      Principal: 'events.amazonaws.com',
      SourceArn: dayRuleResponse.RuleArn,
      StatementId: `${dayOfRuleName}-invoke`
    }));
 
    return {
      status: 'success',
      message: `Rappels programmés pour ${maintenance.vehicle.immat}`
    };
  } catch (error) {
    console.error('Error scheduling reminders:', error);
    return {
      status: 'error',
      message: error.message
    };
  }
 };
 
 module.exports.handler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event));
    const { action, maintenanceId, input } = event.arguments;
    
    switch (action) {
      case 'schedule_maintenance': {
        if (!input) {
          return { status: 'error', message: 'Maintenance data is required' };
        }
        return await scheduleMaintenanceReminders(input);
      }
      case 'cancel_maintenance': {
        try {
          const ruleBaseName = `maint-${maintenanceId.slice(0, 8)}`;
          await eventBridgeServiceClient.send(new DisableRuleCommand({ 
            Name: `${ruleBaseName}-early`
          }));
          await eventBridgeServiceClient.send(new DisableRuleCommand({ 
            Name: `${ruleBaseName}-day`
          }));
        } catch (error) {
          console.warn('Error disabling rules:', error);
        }
 
        // await dalService.updateMaintenanceStatus(maintenanceId, 'CLOSED');
        return { status: 'success', message: 'Maintenance cancelled' };
      }
      default:
        return { status: 'error', message: `Unknown action: ${action}` };
    }
  } catch (error) {
    console.error('Error in handler:', error);
    return { status: 'error', message: error.message };
  }
 };