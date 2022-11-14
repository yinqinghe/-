const database = require('../db/database');
const ForwardAgent = require('../services/agent');
const QUOTA_LIMIT = require('../config/').APP.FREE_USER.QUOTA_LIMIT;

/**
 * Verifies that the source/destination is in one of the two valid formats
 * -- If it's a public entity (username), it should start with "@"
 * -- If it's a private entity (invitation link), it should start with t.me/joinchat/<HASH>
 * @param {string} entity username or invitation link
 * @returns {Object}
 */
const checkSourcePattern = entity => {
  if (entity.indexOf('@') === 0) return { username: entity };
  if (entity.indexOf('t.me/joinchat/') === 0) return { hash: entity.replace('t.me/joinchat/', '') };
  if (entity.indexOf('https://t.me/joinchat/') === 0) return { hash: entity.replace('https://t.me/joinchat/', '') };
  throw new Error('Invalid format');
};

/**
 * Adds a redirection
 * @param {String} sender Chat id of the owner
 * @param {String} source Username / Link of Source
 * @param {String} destination Username / Link of Destination
 */
const addRedirection = async (sender, source, destination) => {
  /////////////////////////////////////////////////
  // Validate and get Source && Destination type //
  /////////////////////////////////////////////////
  let sourceType, destinationType;
  try {
    sourceType = checkSourcePattern(source);
    destinationType = checkSourcePattern(destination);
  } catch (error) {
    console.log(error);
    if (error) return { error: error.message };
  }

  /////////////////
  // Quota Check //
  /////////////////
  const userRecord = await database.getUser(sender);
  if (!userRecord) {
    return {
      error: 'You are not registered. Please send /start to register',
    };
  }
  const userIsPremium = userRecord.premium == '1' ? true : false;
  if (!userIsPremium) {
    if (userRecord.quota >= QUOTA_LIMIT) {
      return {
        error: 'You have reached your quota limit. Please upgrade your account.',
      };
    }
  }

  ///////////////////////////////////////
  // Get Entities                      //
  // If not joinable, will throw Error //
  ///////////////////////////////////////
  let sourceEntity = await ForwardAgent.getEntity(source);
  let destinationEntity = await ForwardAgent.getEntity(destination);

  //////////////////////////
  // Join agent to source //
  //////////////////////////
  let joinSrcRequestResponse = null;
  if (sourceType.username) {
    if (sourceEntity.entity.type === 'user') {
      joinSrcRequestResponse = await ForwardAgent.joinPublicUserEntity(sourceType.username);
    } else {
      joinSrcRequestResponse = await ForwardAgent.joinPublicEntity(sourceType.username);
    }
  } else if (sourceType.hash) {
    joinSrcRequestResponse = await ForwardAgent.joinPrivateEntity(sourceType.hash);
  }
  if (joinSrcRequestResponse.error) return { error: joinSrcRequestResponse.error };

  ///////////////////////////////
  // Join agent to destination //
  ///////////////////////////////
  let joinDestRequestResponse = null;
  if (destinationType.username) {
    if (destinationEntity.entity.type === 'user') {
      joinDestRequestResponse = await ForwardAgent.joinPublicUserEntity(destinationType.username);
    } else {
      joinDestRequestResponse = await ForwardAgent.joinPublicEntity(destinationType.username);
    }
  } else if (destinationType.hash) {
    joinDestRequestResponse = await ForwardAgent.joinPrivateEntity(destinationType.hash);
  }
  if (joinDestRequestResponse.error) return { error: joinDestRequestResponse.error };

  /////////////////////////////////////////////////////////////////
  // We cannot get entity from an invitation link before joining //
  // Now that we have joined, we can get the entity              //
  /////////////////////////////////////////////////////////////////
  if (sourceEntity.entity === null) {
    sourceEntity = await ForwardAgent.getEntity(source);
  }
  if (destinationEntity.entity === null) {
    destinationEntity = await ForwardAgent.getEntity(destination);
  }
  //////////////////////////
  // No Duplicate Entries //
  // No Circular Entries  //
  //////////////////////////
  const allRedirections = await database.getRedirections(sender);
  for (const redirection of allRedirections) {
    const source = redirection.source;
    const destination = redirection.destination;

    if (source == sourceEntity.entity.chatId && destination == destinationEntity.entity.chatId) {
      return { error: `Redirection already exists with id <code>[${redirection.id}]</code> ` };
    }

    if (source == destinationEntity.entity.chatId && destination == sourceEntity.entity.chatId) {
      return { error: `Circular redirection is not allowed <code>[${redirection.id}]</code>` };
    }
  }

  ///////////////////////
  // Store to database //
  // Increase Quota    //
  ///////////////////////
  const srcId = sourceEntity.entity.chatId;
  const destId = destinationEntity.entity.chatId;
  const srcTitle = sourceEntity.entity.title;
  const destTitle = destinationEntity.entity.title;
  await database.saveRedirection(sender, srcId, destId, srcTitle, destTitle);
  await database.changeUserQuota(sender);
  return { success: true };
};

module.exports = addRedirection;
