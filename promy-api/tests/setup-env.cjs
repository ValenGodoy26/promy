process.env.APP_ENV = process.env.APP_ENV || "development";
process.env.NODE_ENV = process.env.NODE_ENV || "development";
process.env.TRUST_PROXY = process.env.TRUST_PROXY || "none";
process.env.ALLOW_WEAK_SECRETS = process.env.ALLOW_WEAK_SECRETS || "1";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
process.env.PUBLIC_WEB_URL = process.env.PUBLIC_WEB_URL || "http://localhost:5173";
process.env.PUBLIC_API_BASE_URL = process.env.PUBLIC_API_BASE_URL || "http://localhost:4000";
process.env.AUTH_EMAIL_PROVIDER = process.env.AUTH_EMAIL_PROVIDER || "console";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "promy-local-jwt-s3cret-9f84k2m1q7r6x5a4";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "promy-local-refresh-s3cret-8d73j1n2p4q6w9";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "mysql://promy:promy@localhost:3306/promy_test";
