// utils/firebaseUtils.js
import fireadmin from "../config/firebase.js"; // use the correct relative path

// Create a new Firebase user
export async function getUserByEmail(email) {
  try {
    const userRecord = await fireadmin.auth().getUserByEmail(email);
    return {
      status: 200,
      data: userRecord,
      statusText: "ok",
    };
  } catch (error) {
    return {
      status: 500,
      error: error.message,
      statusText: "bad",
    };
  }
}
export async function createUser(email, password, full_name) {
  try {
    const userRecord = await fireadmin.auth().createUser({
      email,
      password,
      displayName: full_name,
    });

    return {
      status: 201,
      data: userRecord,
      statusText: "ok",
    };
  } catch (error) {
    console.log("Error creating user:", error);
    return {
      status: 500,
      error: error.message,
      statusText: "bad",
    };
  }
}

// Set custom claims for a user
export async function customeClaims(uid, customClaims) {
  try {
    await fireadmin.auth().setCustomUserClaims(uid, customClaims);
    return {message: "Custom claims set successfully"};
  } catch (error) {
    console.error("Error creating custom token:", error);
    throw error;
  }
}

// Push notification to a device
export async function pushNotification(title, message, fcmToken, uid) {
  if (!fcmToken) {
    console.log(`🚨 FCM token is null`);
    return;
  }

  try {
    const response = await fireadmin.messaging().send({
      token: fcmToken,
      webpush: {
        notification: {
          title,
          body: message,
          icon: "https://canfixit.net/images/icon.png",
        },
        fcm_options: {link: "https://canfixit.net"},
      },
      android: {
        notification: {
          title,
          body: message,
          icon: "https://canfixit.net/images/icon.png",
          color: "#FF9900",
          sound: "default",
          priority: "high",
        },
        data: {click_action: "FLUTTER_NOTIFICATION_CLICK", userId: uid},
      },
      apns: {
        payload: {
          aps: {
            alert: {title, body: message},
            sound: "default",
            badge: 1,
          },
        },
        headers: {"apns-priority": "10"},
      },
      data: {click_action: "FLUTTER_NOTIFICATION_CLICK", userId: uid},
    });

    console.log("✅ Notification sent successfully");
    return {status: 200, message: "Notification sent successfully", response};
  } catch (error) {
    console.error(error);
    return {status: 500, message: error.message, error};
  }
}

// Delete all Firebase users
export async function deleteAllUsers() {
  let nextPageToken;
  do {
    const listUsersResult = await fireadmin
      .auth()
      .listUsers(1000, nextPageToken);
    const deleteTasks = listUsersResult.users.map((user) =>
      fireadmin.auth().deleteUser(user.uid),
    );
    await Promise.all(deleteTasks);
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  return {message: "All users deleted successfully"};
}

// Delete a specific user by UID
export async function deleteUserByUid(uid) {
  try {
    await fireadmin.auth().deleteUser(uid);
    return {message: `User with UID ${uid} deleted successfully`};
  } catch (error) {
    throw new Error(`Error deleting user with UID ${uid}: ${error.message}`);
  }
}

// Create multiple users programmatically
export async function createMultipleUsers(start = 1, end = 1000) {
  const users = [];
  for (let i = start; i <= end; i++) {
    const email = `jilanfo${i}@example.com`;
    const password = `Password${i}`;
    try {
      const userRecord = await fireadmin.auth().createUser({
        email,
        password,
        displayName: `User ${i}`,
      });
      users.push({
        uid: userRecord.uid,
        email,
        displayName: userRecord.displayName,
      });
      console.log(`Created user: ${email}`);
    } catch (error) {
      console.error(`Error creating user ${email}:`, error.message);
    }
  }
  return {message: `Created ${users.length} users`, users};
}

// List all Firebase users
export async function listAllUsers() {
  let users = [];
  let nextPageToken;

  do {
    const listUsersResult = await fireadmin
      .auth()
      .listUsers(1000, nextPageToken);
    users = users.concat(listUsersResult.users.map((user) => user.toJSON()));
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);

  return users;
}

export async function revokeUser(uid) {
  const userRecord = await fireadmin.auth().getUser(uid);
  const timestamp = new Date(userRecord.tokensValidAfterTime).getTime() / 1000;
  console.log(`Tokens revoked at: ${timestamp}`);

  // disable the user infirebase

  await fireadmin.auth().updateUser(uid, {disabled: true});
  return userRecord;
}
export async function restateUser(uid) {
  const userRecord = await fireadmin.auth().updateUser(uid, {disabled: false});
  return userRecord;
}
