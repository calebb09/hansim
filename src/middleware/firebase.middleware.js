import admin from "firebase-admin";

const getAuthToken = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.split(" ")[0] === "Bearer"
  ) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

const attachFirebaseUser = (req, authToken, decodedToken) => {
  const userRole = decodedToken.role || "STUDENT";

  req.authToken = authToken;
  req.user = {
    uuid: decodedToken.uid,
    phone_number: decodedToken.phone_number,
    role: userRole,
    picture: decodedToken.picture,
    email: decodedToken.email,
    full_name: decodedToken.full_name || decodedToken.name,
  };
  req.firebaseUser = decodedToken;
};

export const FirebaseAuthenticated = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const authToken = getAuthToken(req);

      if (!authToken) {
        return res.status(401).json({
          success: false,
          error: "Authorization token is required",
        });
      }

      const decodedToken = await admin.auth().verifyIdToken(authToken);
      attachFirebaseUser(req, authToken, decodedToken);

      // Role-based access control
      if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
        if (!allowedRoles.includes(req.user.role)) {
          return res.status(403).json({
            success: false,
            error: "You do not have permission to access this resource",
          });
        }
      }

      next();
    } catch (error) {
      console.error("Firebase Auth Error:", error.message);
      return res.status(401).json({
        success: false,
        error: "YOU ARE NOT AUTHORIZED TO MAKE THIS REQUEST (Firebase)",
      });
    }
  };
};

export const OptionalFirebaseAuthenticated = () => {
  return async (req, res, next) => {
    try {
      const authToken = getAuthToken(req);

      if (!authToken) {
        return next();
      }

      const decodedToken = await admin.auth().verifyIdToken(authToken);
      attachFirebaseUser(req, authToken, decodedToken);

      next();
    } catch (error) {
      console.error("Optional Firebase Auth Error:", error.message);
      return res.status(401).json({
        success: false,
        error: "Invalid authorization token",
      });
    }
  };
};
