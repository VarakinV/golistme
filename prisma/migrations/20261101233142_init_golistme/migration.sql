-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'REMOVED');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('MANAGE_LISTINGS', 'GENERATE_MARKETING', 'VIEW_LEADS', 'VIEW_ANALYTICS', 'PURCHASE_CREDITS');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'SOLD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReelStatus" AS ENUM ('QUEUED', 'RENDERING', 'COMPLETE', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('REEL', 'SLIDESHOW', 'FLYER', 'SOCIAL_POST', 'VIDEO', 'QR_PRINTABLE', 'PAGE_IMAGE');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'QR_CODE');

-- CreateEnum
CREATE TYPE "QRCodeStatus" AS ENUM ('UNASSIGNED', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('WELCOME_GRANT', 'PURCHASE', 'REFERRAL_GRANT', 'ADMIN_GRANT', 'GENERATION_RESERVATION', 'GENERATION_DEDUCTION', 'GENERATION_REFUND', 'ADJUSTMENT', 'EXPIRATION');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "avatarUrl" TEXT,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealtorWorkspace" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "headshot" TEXT,
    "companyName" TEXT,
    "companyLogo" TEXT,
    "brandColor" TEXT,
    "websiteUrl" TEXT,
    "facebookUrl" TEXT,
    "linkedinUrl" TEXT,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "twitterUrl" TEXT,
    "pinterestUrl" TEXT,
    "vimeoUrl" TEXT,
    "tiktokUrl" TEXT,
    "ownerUserId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealtorWorkspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMembership" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'ASSISTANT',
    "permissions" "Permission"[] DEFAULT ARRAY[]::"Permission"[],
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'ASSISTANT',
    "permissions" "Permission"[] DEFAULT ARRAY[]::"Permission"[],
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "invitedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealtorProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "headshot" TEXT,
    "companyName" TEXT,
    "companyLogo" TEXT,
    "websiteUrl" TEXT,
    "facebookUrl" TEXT,
    "linkedinUrl" TEXT,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "twitterUrl" TEXT,
    "pinterestUrl" TEXT,
    "vimeoUrl" TEXT,
    "tiktokUrl" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RealtorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingCoRealtor" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "realtorProfileId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ListingCoRealtor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "propertyAddress" TEXT NOT NULL,
    "propertyFormattedAddress" TEXT,
    "propertyLat" DOUBLE PRECISION,
    "propertyLng" DOUBLE PRECISION,
    "propertyCity" TEXT,
    "propertyProvince" TEXT,
    "propertyPostalCode" TEXT,
    "propertyCountry" TEXT,
    "propertyPlaceId" TEXT,
    "propertyAddressOverride" TEXT,
    "propertyCityOverride" TEXT,
    "propertyPostalCodeOverride" TEXT,
    "propertySize" INTEGER,
    "yearBuilt" INTEGER,
    "mlsNumber" TEXT,
    "listPrice" INTEGER,
    "bedrooms" TEXT,
    "bathrooms" TEXT,
    "featuresText" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "urlMls" TEXT,
    "filename" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FloorPlan" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FloorPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Embed" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "embedUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Embed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT,
    "assetType" "AssetType" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'remotion',
    "status" "ReelStatus" NOT NULL DEFAULT 'QUEUED',
    "costCredits" INTEGER NOT NULL DEFAULT 0,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "externalId" TEXT,
    "error" TEXT,
    "outputUrl" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderReel" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "renderId" TEXT NOT NULL,
    "status" "ReelStatus" NOT NULL,
    "url" TEXT,
    "thumbnail" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "error" TEXT,
    "musicTrackId" TEXT,
    "jobId" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderReel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoMusicTrack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "genre" TEXT,
    "mood" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoMusicTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoTemplate" (
    "id" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'remotion',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "fps" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "durationInFrames" INTEGER NOT NULL,
    "compositionId" TEXT NOT NULL,
    "schemaJson" JSONB,
    "defaultMusicTrackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderReelSourceImage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderReelSourceImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderFlyer" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "status" "ReelStatus" NOT NULL,
    "url" TEXT,
    "previewUrl" TEXT,
    "pageWidth" INTEGER,
    "pageHeight" INTEGER,
    "error" TEXT,
    "jobId" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderFlyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPostTemplate" (
    "id" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPostTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderSocialPost" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "status" "ReelStatus" NOT NULL,
    "url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "error" TEXT,
    "jobId" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderSocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyPage" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "template" INTEGER NOT NULL,
    "urlPath" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyInquiry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'WEBSITE',
    "qrAssignmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerReportLink" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerReportLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT,
    "sessionHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRCode" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "displayId" TEXT NOT NULL,
    "status" "QRCodeStatus" NOT NULL DEFAULT 'UNASSIGNED',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRAssignment" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "propertyPageId" TEXT,
    "sendWeeklyStats" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "QRAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRScanEvent" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionHash" TEXT NOT NULL,
    "userAgent" TEXT,

    CONSTRAINT "QRScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRPrintable" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "variantKey" TEXT NOT NULL,
    "status" "ReelStatus" NOT NULL DEFAULT 'QUEUED',
    "svgUrl" TEXT,
    "pngUrl" TEXT,
    "pdfUrl" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QRPrintable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT,
    "relatedPaymentId" TEXT,
    "relatedGenerationJobId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceCreditBalance" (
    "workspaceId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceCreditBalance_pkey" PRIMARY KEY ("workspaceId")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "initiatedByUserId" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'cad',
    "creditsPurchased" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RealtorWorkspace_slug_key" ON "RealtorWorkspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RealtorWorkspace_stripeCustomerId_key" ON "RealtorWorkspace"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "RealtorWorkspace_ownerUserId_idx" ON "RealtorWorkspace"("ownerUserId");

-- CreateIndex
CREATE INDEX "RealtorWorkspace_status_idx" ON "RealtorWorkspace"("status");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_userId_status_idx" ON "WorkspaceMembership"("userId", "status");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_workspaceId_status_idx" ON "WorkspaceMembership"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_userId_key" ON "WorkspaceMembership"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_workspaceId_status_idx" ON "Invitation"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Invitation_email_status_idx" ON "Invitation"("email", "status");

-- CreateIndex
CREATE INDEX "RealtorProfile_workspaceId_idx" ON "RealtorProfile"("workspaceId");

-- CreateIndex
CREATE INDEX "ListingCoRealtor_realtorProfileId_idx" ON "ListingCoRealtor"("realtorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingCoRealtor_listingId_realtorProfileId_key" ON "ListingCoRealtor"("listingId", "realtorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");

-- CreateIndex
CREATE INDEX "Listing_realtorId_status_idx" ON "Listing"("realtorId", "status");

-- CreateIndex
CREATE INDEX "Listing_status_publishedAt_idx" ON "Listing"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Photo_orderId_sortOrder_idx" ON "Photo"("orderId", "sortOrder");

-- CreateIndex
CREATE INDEX "Video_orderId_idx" ON "Video"("orderId");

-- CreateIndex
CREATE INDEX "FloorPlan_orderId_idx" ON "FloorPlan"("orderId");

-- CreateIndex
CREATE INDEX "Attachment_orderId_idx" ON "Attachment"("orderId");

-- CreateIndex
CREATE INDEX "Embed_orderId_idx" ON "Embed"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_idempotencyKey_key" ON "GenerationJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GenerationJob_workspaceId_status_idx" ON "GenerationJob"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "GenerationJob_orderId_idx" ON "GenerationJob"("orderId");

-- CreateIndex
CREATE INDEX "GenerationJob_assetType_status_idx" ON "GenerationJob"("assetType", "status");

-- CreateIndex
CREATE INDEX "OrderReel_orderId_status_idx" ON "OrderReel"("orderId", "status");

-- CreateIndex
CREATE INDEX "OrderReel_musicTrackId_idx" ON "OrderReel"("musicTrackId");

-- CreateIndex
CREATE INDEX "OrderReel_jobId_idx" ON "OrderReel"("jobId");

-- CreateIndex
CREATE INDEX "VideoMusicTrack_isActive_idx" ON "VideoMusicTrack"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VideoTemplate_variantKey_key" ON "VideoTemplate"("variantKey");

-- CreateIndex
CREATE INDEX "VideoTemplate_status_provider_idx" ON "VideoTemplate"("status", "provider");

-- CreateIndex
CREATE INDEX "OrderReelSourceImage_orderId_sortOrder_idx" ON "OrderReelSourceImage"("orderId", "sortOrder");

-- CreateIndex
CREATE INDEX "OrderFlyer_orderId_status_idx" ON "OrderFlyer"("orderId", "status");

-- CreateIndex
CREATE INDEX "OrderFlyer_jobId_idx" ON "OrderFlyer"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPostTemplate_variantKey_key" ON "SocialPostTemplate"("variantKey");

-- CreateIndex
CREATE INDEX "SocialPostTemplate_status_idx" ON "SocialPostTemplate"("status");

-- CreateIndex
CREATE INDEX "OrderSocialPost_orderId_status_idx" ON "OrderSocialPost"("orderId", "status");

-- CreateIndex
CREATE INDEX "OrderSocialPost_orderId_variantKey_idx" ON "OrderSocialPost"("orderId", "variantKey");

-- CreateIndex
CREATE INDEX "OrderSocialPost_jobId_idx" ON "OrderSocialPost"("jobId");

-- CreateIndex
CREATE INDEX "PropertyPage_orderId_idx" ON "PropertyPage"("orderId");

-- CreateIndex
CREATE INDEX "PropertyPage_urlPath_idx" ON "PropertyPage"("urlPath");

-- CreateIndex
CREATE INDEX "PropertyInquiry_qrAssignmentId_idx" ON "PropertyInquiry"("qrAssignmentId");

-- CreateIndex
CREATE INDEX "PropertyInquiry_workspaceId_createdAt_idx" ON "PropertyInquiry"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "PropertyInquiry_orderId_createdAt_idx" ON "PropertyInquiry"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SellerReportLink_tokenHash_key" ON "SellerReportLink"("tokenHash");

-- CreateIndex
CREATE INDEX "SellerReportLink_orderId_idx" ON "SellerReportLink"("orderId");

-- CreateIndex
CREATE INDEX "SellerReportLink_workspaceId_idx" ON "SellerReportLink"("workspaceId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_orderId_createdAt_idx" ON "AnalyticsEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QRCode_seq_key" ON "QRCode"("seq");

-- CreateIndex
CREATE UNIQUE INDEX "QRCode_displayId_key" ON "QRCode"("displayId");

-- CreateIndex
CREATE INDEX "QRCode_status_idx" ON "QRCode"("status");

-- CreateIndex
CREATE INDEX "QRAssignment_qrCodeId_unassignedAt_idx" ON "QRAssignment"("qrCodeId", "unassignedAt");

-- CreateIndex
CREATE INDEX "QRAssignment_orderId_idx" ON "QRAssignment"("orderId");

-- CreateIndex
CREATE INDEX "QRScanEvent_assignmentId_scannedAt_idx" ON "QRScanEvent"("assignmentId", "scannedAt");

-- CreateIndex
CREATE INDEX "QRPrintable_qrCodeId_status_idx" ON "QRPrintable"("qrCodeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QRPrintable_qrCodeId_variantKey_key" ON "QRPrintable"("qrCodeId", "variantKey");

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_idempotencyKey_key" ON "CreditTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CreditTransaction_workspaceId_createdAt_idx" ON "CreditTransaction"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");

-- CreateIndex
CREATE INDEX "CreditTransaction_relatedGenerationJobId_idx" ON "CreditTransaction"("relatedGenerationJobId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripeCheckoutSessionId_key" ON "Payment"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Payment_workspaceId_status_idx" ON "Payment"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StripeWebhookEvent_stripeEventId_key" ON "StripeWebhookEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_type_createdAt_idx" ON "StripeWebhookEvent"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- AddForeignKey
ALTER TABLE "RealtorWorkspace" ADD CONSTRAINT "RealtorWorkspace_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "RealtorWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "RealtorWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealtorProfile" ADD CONSTRAINT "RealtorProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "RealtorWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RealtorProfile" ADD CONSTRAINT "RealtorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingCoRealtor" ADD CONSTRAINT "ListingCoRealtor_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingCoRealtor" ADD CONSTRAINT "ListingCoRealtor_realtorProfileId_fkey" FOREIGN KEY ("realtorProfileId") REFERENCES "RealtorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "RealtorWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FloorPlan" ADD CONSTRAINT "FloorPlan_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embed" ADD CONSTRAINT "Embed_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "RealtorWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReel" ADD CONSTRAINT "OrderReel_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReel" ADD CONSTRAINT "OrderReel_musicTrackId_fkey" FOREIGN KEY ("musicTrackId") REFERENCES "VideoMusicTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReel" ADD CONSTRAINT "OrderReel_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTemplate" ADD CONSTRAINT "VideoTemplate_defaultMusicTrackId_fkey" FOREIGN KEY ("defaultMusicTrackId") REFERENCES "VideoMusicTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReelSourceImage" ADD CONSTRAINT "OrderReelSourceImage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderFlyer" ADD CONSTRAINT "OrderFlyer_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderFlyer" ADD CONSTRAINT "OrderFlyer_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSocialPost" ADD CONSTRAINT "OrderSocialPost_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSocialPost" ADD CONSTRAINT "OrderSocialPost_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPage" ADD CONSTRAINT "PropertyPage_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInquiry" ADD CONSTRAINT "PropertyInquiry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "RealtorWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInquiry" ADD CONSTRAINT "PropertyInquiry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInquiry" ADD CONSTRAINT "PropertyInquiry_qrAssignmentId_fkey" FOREIGN KEY ("qrAssignmentId") REFERENCES "QRAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerReportLink" ADD CONSTRAINT "SellerReportLink_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "RealtorWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerReportLink" ADD CONSTRAINT "SellerReportLink_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRAssignment" ADD CONSTRAINT "QRAssignment_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRAssignment" ADD CONSTRAINT "QRAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRAssignment" ADD CONSTRAINT "QRAssignment_propertyPageId_fkey" FOREIGN KEY ("propertyPageId") REFERENCES "PropertyPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRScanEvent" ADD CONSTRAINT "QRScanEvent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "QRAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRPrintable" ADD CONSTRAINT "QRPrintable_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "RealtorWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_relatedPaymentId_fkey" FOREIGN KEY ("relatedPaymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_relatedGenerationJobId_fkey" FOREIGN KEY ("relatedGenerationJobId") REFERENCES "GenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceCreditBalance" ADD CONSTRAINT "WorkspaceCreditBalance_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "RealtorWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "RealtorWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
