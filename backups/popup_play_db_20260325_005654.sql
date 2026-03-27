--
-- PostgreSQL database dump
--

\restrict oNQvwQeA8UjJtvRt1MGvqoDiOLMxUpW1hQs9ZK6UUARRnNjwsIYteSAi3bBh9ac

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AboutVideo; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."AboutVideo" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    video_url text NOT NULL,
    description text,
    "order" integer,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."AboutVideo" OWNER TO popupapp;

--
-- Name: AccessCode; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."AccessCode" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    usage_limit integer,
    used_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    description text,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    valid_until timestamp without time zone,
    is_used boolean DEFAULT false,
    used_by character varying(255),
    used_at timestamp without time zone,
    created_by character varying(255)
);


ALTER TABLE public."AccessCode" OWNER TO popupapp;

--
-- Name: BlockedUser; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."BlockedUser" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    blocker_email character varying(255) NOT NULL,
    blocked_email character varying(255) NOT NULL,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."BlockedUser" OWNER TO popupapp;

--
-- Name: BroadcastMessage; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."BroadcastMessage" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_email character varying(255) NOT NULL,
    subject character varying(255) NOT NULL,
    message text NOT NULL,
    recipients_count integer DEFAULT 0,
    created_by character varying(255) NOT NULL,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    emails_sent integer DEFAULT 0,
    emails_failed integer DEFAULT 0
);


ALTER TABLE public."BroadcastMessage" OWNER TO popupapp;

--
-- Name: COLUMN "BroadcastMessage".emails_sent; Type: COMMENT; Schema: public; Owner: popupapp
--

COMMENT ON COLUMN public."BroadcastMessage".emails_sent IS 'Number of emails successfully sent for this broadcast';


--
-- Name: COLUMN "BroadcastMessage".emails_failed; Type: COMMENT; Schema: public; Owner: popupapp
--

COMMENT ON COLUMN public."BroadcastMessage".emails_failed IS 'Number of emails that failed to send for this broadcast';


--
-- Name: EmailVerificationOTP; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."EmailVerificationOTP" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    otp character varying(10) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    attempts integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."EmailVerificationOTP" OWNER TO popupapp;

--
-- Name: Message; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."Message" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_email character varying(255) NOT NULL,
    receiver_email character varying(255) NOT NULL,
    recipient_email character varying(255),
    content text NOT NULL,
    read boolean DEFAULT false,
    is_read boolean DEFAULT false,
    conversation_id character varying(255),
    attachment_url text,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_for text[] DEFAULT ARRAY[]::text[]
);


ALTER TABLE public."Message" OWNER TO popupapp;

--
-- Name: PasswordResetToken; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."PasswordResetToken" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."PasswordResetToken" OWNER TO popupapp;

--
-- Name: ProfileVideo; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."ProfileVideo" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_email character varying(255) NOT NULL,
    video_url text NOT NULL,
    caption text,
    views integer DEFAULT 0,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."ProfileVideo" OWNER TO popupapp;

--
-- Name: Reel; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."Reel" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_email character varying(255) NOT NULL,
    video_url text NOT NULL,
    caption text,
    duration integer,
    views integer DEFAULT 0,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."Reel" OWNER TO popupapp;

--
-- Name: SubscriptionSettings; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."SubscriptionSettings" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_name character varying(255) NOT NULL,
    description text,
    monthly_price numeric(10,2),
    annual_price numeric(10,2),
    currency character varying(10) DEFAULT 'USD'::character varying,
    features text[] DEFAULT ARRAY[]::text[],
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    stripe_price_id character varying(255),
    free_trial_enabled boolean DEFAULT false,
    trial_days integer DEFAULT 30,
    subscription_enabled boolean DEFAULT false,
    paypal_plan_id character varying(255)
);


ALTER TABLE public."SubscriptionSettings" OWNER TO popupapp;

--
-- Name: User; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."User" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    password_hash character varying(255),
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    role character varying(50) DEFAULT USER,
    is_email_verified boolean DEFAULT false
);


ALTER TABLE public."User" OWNER TO popupapp;

--
-- Name: UserProfile; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."UserProfile" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_email character varying(255) NOT NULL,
    display_name character varying(255),
    name character varying(255),
    bio text,
    avatar_url text,
    age integer,
    gender character varying(50),
    interested_in character varying(50),
    interests text[] DEFAULT ARRAY[]::text[],
    hobbies text,
    looking_for text,
    city character varying(255),
    state character varying(255),
    zip_code character varying(20),
    country character varying(255),
    is_popped_up boolean DEFAULT false,
    has_ever_popped_up boolean DEFAULT false,
    popup_message text,
    photos text[] DEFAULT ARRAY[]::text[],
    videos text[] DEFAULT ARRAY[]::text[],
    location character varying(255),
    latitude numeric(10,8),
    longitude numeric(11,8),
    last_location_update timestamp without time zone,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    email_notifications_enabled boolean DEFAULT true
);


ALTER TABLE public."UserProfile" OWNER TO popupapp;

--
-- Name: UserSession; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."UserSession" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_email character varying(255) NOT NULL,
    device_id character varying(255) NOT NULL,
    last_active timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_agent text,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."UserSession" OWNER TO popupapp;

--
-- Name: UserSubscription; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."UserSubscription" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_email character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'inactive'::character varying,
    plan character varying(100),
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    stripe_subscription_id character varying(255),
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    paypal_order_id character varying(255),
    paypal_subscription_id character varying(255)
);


ALTER TABLE public."UserSubscription" OWNER TO popupapp;

--
-- Name: VideoSignal; Type: TABLE; Schema: public; Owner: popupapp
--

CREATE TABLE public."VideoSignal" (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id character varying(255) NOT NULL,
    from_email character varying(255) NOT NULL,
    to_email character varying(255) NOT NULL,
    signal_type character varying(50) NOT NULL,
    signal_data text,
    created_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public."VideoSignal" OWNER TO popupapp;

--
-- Data for Name: AboutVideo; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."AboutVideo" (id, title, video_url, description, "order", created_date, updated_date) FROM stdin;
\.


--
-- Data for Name: AccessCode; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."AccessCode" (id, code, usage_limit, used_count, is_active, description, created_date, updated_date, valid_until, is_used, used_by, used_at, created_by) FROM stdin;
574e74bf-54f6-4bbe-bd4d-000dd3252247	YQCF38HL	\N	0	t	\N	2026-03-12 21:16:46.435358	2026-03-12 21:16:46.435358	2026-04-11 21:16:46.256	t	danishcreates786@gmail.com	2026-03-13 16:36:24.891	contact@popupplay.fun
14dd4c5e-ca47-4235-910f-e27dccfaf22e	XSIW3NPZ	\N	0	t	\N	2026-03-13 16:40:04.214707	2026-03-13 16:40:04.214707	2026-04-12 16:40:04.024	t	danishrehman78677@gmail.com	2026-03-13 16:40:18.392	contact@popupplay.fun
76a275b4-c547-4e83-8783-9bbc5d11fcd2	14TGZZ5J	\N	0	t	\N	2026-03-13 22:20:32.013632	2026-03-13 22:20:32.013632	2026-03-28 22:20:31.951	t	saicharan.629@gmail.com	2026-03-13 22:21:04.087	contact@popupplay.fun
93747fa3-3ef5-4ebc-84c5-4a5302b426fc	VPP9TEPI	\N	0	t	\N	2026-03-16 19:54:52.191392	2026-03-16 19:54:52.191392	2026-04-15 19:54:52.049	t	blackpagevideo1@gmail.com	2026-03-16 19:55:36.842	contact@popupplay.fun
6ccbb866-dd96-4918-8f9e-df087cdddf66	0SPDDVRR	\N	0	t	\N	2026-03-17 19:04:10.861186	2026-03-17 19:04:10.861186	2026-03-20 19:04:10.771	t	Nashville52002@yahoo.com	2026-03-17 19:09:44.161	contact@popupplay.fun
0daba598-75e5-42b9-bbc2-ff9f1ecf9e38	GVIROG9C	\N	0	t	\N	2026-03-17 16:19:36.204511	2026-03-17 16:19:36.204511	2026-04-16 16:19:36.112	t	jnightmare15@gmail.com	2026-03-17 22:25:43.094	contact@popupplay.fun
7318676d-8dbe-47ca-b12b-cdbe477fef68	TC2WW5DT	\N	0	t	\N	2026-03-17 18:01:20.988054	2026-03-17 18:01:20.988054	2026-04-06 18:01:20.875	t	mnrealestate11@yahoo.com	2026-03-18 10:35:53.118	contact@popupplay.fun
f4a3de57-a259-4e19-b2c0-656904ea10f1	S62QKQ6T	\N	0	t	\N	2026-03-18 05:20:20.148065	2026-03-18 05:20:20.148065	2026-04-02 05:20:19.982	t	donalddump77@gmail.com	2026-03-18 11:35:52.52	contact@popupplay.fun
15246219-a0a4-4c0e-a226-2a6a7cc66f87	DAYPVTOB	\N	0	t	\N	2026-03-19 21:53:31.289055	2026-03-19 21:53:31.289055	2026-04-13 21:53:31.236	t	bigboo87_05@yahoo.com	2026-03-20 00:23:23.771	contact@popupplay.fun
91a40508-0ab2-4514-8e23-32e0123f02e7	RH3S6HAA	\N	0	t	\N	2026-03-19 00:02:34.752169	2026-03-19 00:02:34.752169	2026-04-18 00:02:33.575	t	bacon5693@gmail.com	2026-03-21 20:47:28.24	contact@popupplay.fun
d41e094f-a7fb-4a7b-888a-bfc929bafd6b	RJ5AROIE	\N	0	t	\N	2026-03-21 15:55:45.110459	2026-03-21 15:55:45.110459	2026-04-20 15:55:44.948	t	blackpagevideo1@gmail.com	2026-03-21 20:53:55.164	contact@popupplay.fun
1c9b7db0-d4b5-44e8-94fb-418ad30030ca	ASZXOEI5	\N	0	t	\N	2026-03-19 00:02:41.675182	2026-03-19 00:02:41.675182	2026-04-18 00:02:40.525	t	bighomiie5150@gmail.com	2026-03-23 19:13:47.399	contact@popupplay.fun
a70ca657-89a9-460e-a9a5-758048504567	2IPVEN1W	\N	0	t	\N	2026-03-23 19:37:26.973864	2026-03-23 19:37:26.973864	2026-04-22 19:37:26.838	t	bear79072@gmail.com	2026-03-23 19:39:20.707	contact@popupplay.fun
\.


--
-- Data for Name: BlockedUser; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."BlockedUser" (id, blocker_email, blocked_email, created_date, updated_date) FROM stdin;
\.


--
-- Data for Name: BroadcastMessage; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."BroadcastMessage" (id, from_email, subject, message, recipients_count, created_by, created_date, updated_date, emails_sent, emails_failed) FROM stdin;
b6619e46-e919-4512-8bfb-f2b636e66d44	contact@popupplay.fun	New Updates	We are doing new updates.	12	contact@popupplay.fun	2026-03-15 04:05:11.205342	2026-03-15 04:05:11.205342	0	0
ffcdcc18-9482-4b44-b474-85a99fa8a6ad	contact@popupplay.fun	Test Broadcast	This is the broadcast message which should be sending email also.	17	contact@popupplay.fun	2026-03-17 09:56:29.214388	2026-03-17 09:56:29.214388	0	0
e2c5c911-2049-4403-af03-7a0857e266ea	contact@popupplay.fun	Broadcast Email Test 100339	This is a server-side test to verify broadcast email delivery.	17	contact@popupplay.fun	2026-03-17 10:03:39.252326	2026-03-17 10:04:00.265752	17	0
f8c332ff-6044-451f-9737-db075c27d2b3	contact@popupplay.fun	Broadcast Email Test Manual	manual test	17	contact@popupplay.fun	2026-03-17 10:04:05.034519	2026-03-17 10:04:26.02386	17	0
d0ecc0a1-ad17-465b-aaa9-6383962c8929	contact@popupplay.fun	Broadcast Email Test Manual	manual test	17	contact@popupplay.fun	2026-03-17 10:04:18.021978	2026-03-17 10:04:40.098002	17	0
ed17d2b1-7ca4-4582-880f-e4c31b2cedc6	contact@popupplay.fun	test	test	17	contact@popupplay.fun	2026-03-17 10:07:14.86168	2026-03-17 10:07:33.86765	17	0
03065fe5-8036-4e8a-a00c-5ce0c3e02975	contact@popupplay.fun	Updates	We are making updates. Stay tuned.	28	contact@popupplay.fun	2026-03-20 14:48:59.980184	2026-03-20 14:49:06.997931	28	0
dce289c1-1050-4f2c-971c-e7227af44d83	contact@popupplay.fun	Bbc filming in Dallas, Tx	We are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	31	contact@popupplay.fun	2026-03-21 02:38:19.84714	2026-03-21 02:38:27.014126	31	0
8cfd2f67-18f9-43d5-8bb5-769b4d669fa2	contact@popupplay.fun	Dallas, Tx BBC Party Address	This is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	38	contact@popupplay.fun	2026-03-21 19:31:52.606271	2026-03-21 19:32:01.12207	38	0
567d0f64-0ec6-4a24-b622-9a0590424fbf	contact@popupplay.fun	We need BBCs in Dallas, TX	We need BBCs at the Quality Inn, in Dallas, TX right now!	43	contact@popupplay.fun	2026-03-22 00:57:27.125783	2026-03-22 00:57:36.558713	43	0
4636f5d5-b96a-4fc7-aafd-64a0e4a04b59	contact@popupplay.fun	Bugs in the Software 	We are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	45	contact@popupplay.fun	2026-03-22 22:30:45.333676	2026-03-22 22:30:55.687076	45	0
\.


--
-- Data for Name: EmailVerificationOTP; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."EmailVerificationOTP" (id, email, otp, expires_at, used, attempts, created_at) FROM stdin;
81415700-6acb-472b-bdbe-bf0130250585	danishwithfiverr326@gmail.com	565729	2026-03-14 06:20:10.341	t	1	2026-03-14 06:10:10.344218
33d37c03-e0a0-479b-aff2-6f96ed8b3ed8	mdg476121@hotmail.com	344157	2026-03-21 22:03:59.012	t	1	2026-03-21 21:53:59.013751
73f5edfd-ef25-4609-a445-3c83f36fcae1	danishwithfiverr326@gmail.com	081485	2026-03-14 06:30:31.602	t	1	2026-03-14 06:20:31.604233
259a0a93-2dd6-4bd6-9977-f1df6b33d414	blinkz4all@gmail.com	395513	2026-03-14 10:10:55.146	t	1	2026-03-14 10:00:55.149101
140d8cfc-8635-4719-9566-660b39a1c57e	little0hollow@gmail.com	851785	2026-03-15 00:59:29.15	t	1	2026-03-15 00:49:29.152058
7bd85c34-818f-4cef-838a-b031da23eb5a	gonzo1795@yahoo.com	812440	2026-03-21 22:19:30.839	t	1	2026-03-21 22:09:30.841195
b057c0c0-ee62-4b34-84ed-6b91a09fab0b	jonesz521@yahoo.com	228029	2026-03-15 20:55:34.288	t	1	2026-03-15 20:45:34.290791
2bee2ff2-4ee1-4e50-8c73-b03668b14351	mnrealestate11@yahoo.com	980250	2026-03-16 01:52:57.26	t	1	2026-03-16 01:42:57.261427
6f59cdde-90c8-41f7-834a-fa30157dcfd6	fridman2014@gmail.com	591787	2026-03-16 18:16:08.157	t	1	2026-03-16 18:06:08.158755
dea5ef91-b75b-495b-89f1-1c57632ecb71	niitepaine05@gmail.com	056432	2026-03-22 18:16:40.255	t	1	2026-03-22 18:06:40.256598
e656b83e-b440-49ed-9d4e-c535f5ab857f	yourstrulykg469@gmail.com	638706	2026-03-16 22:35:49.849	t	1	2026-03-16 22:25:49.850162
abea4514-7728-487e-b8c6-8191edbe610e	kqofhearts420@gmail.com	653441	2026-03-17 21:37:10.446	t	1	2026-03-17 21:27:10.448811
c8b14084-133b-4314-a9d6-8c3f5a0ca3f2	jnightmare15@gmail.com	469615	2026-03-17 22:28:54.676	t	1	2026-03-17 22:18:54.678347
a6a46855-930e-40b9-b007-418932271f56	wildrosentx@gmail.com	271094	2026-03-23 02:39:12.698	t	1	2026-03-23 02:29:12.699251
921ad18c-32f7-4a40-859c-b0ff7bf838e3	Im1badman7@yahoo.com	313387	2026-03-18 03:12:03.66	t	1	2026-03-18 03:02:03.661345
cc5992e4-af60-4591-ab7b-0a1c610a98a8	donalddump77@gmail.com	712685	2026-03-18 05:09:45.43	t	0	2026-03-18 04:59:45.431775
68f8feba-a25b-42f0-a168-4f409a28b860	donalddump77@gmail.com	748496	2026-03-18 05:12:08.056	t	1	2026-03-18 05:02:08.05639
5bc01ef0-5dbd-4484-a06c-4f44e4dad8ae	bbcn314@yahoo.com	160205	2026-03-18 18:15:00.997	t	0	2026-03-18 18:05:01.000979
a5b13290-4034-444c-befe-e9626e960cc1	bbcn314@yahoo.com	142149	2026-03-18 18:21:28.739	t	1	2026-03-18 18:11:28.739387
ac52fd77-8edf-4831-bba3-b4bcabcbb1ad	bigboo87_05@yahoo.com	949728	2026-03-18 20:03:21.141	t	0	2026-03-18 19:53:21.14428
5918ab41-b5d7-49b9-b538-4d031bc7e1d0	bear79072@gmail.com	323111	2026-03-23 19:16:39.817	t	1	2026-03-23 19:06:39.819448
c349e716-d3a8-49b0-94da-5f67b7a98881	bigboo87_05@yahoo.com	156450	2026-03-18 20:06:20.163	t	1	2026-03-18 19:56:20.163428
ff818197-61e6-45f3-a6ab-3996f68546bc	bacon5693@gmail.com	140611	2026-03-20 14:33:55.939	t	1	2026-03-20 14:23:55.941754
4093a93b-0723-4b4a-b066-526dbaa8f78c	kmusgrove82@aol.com	537223	2026-03-21 01:33:58.914	t	0	2026-03-21 01:23:58.915397
f473a5ff-432f-47c4-a2e0-47fafa1dd1a6	kmusgrove82@aol.com	667935	2026-03-21 01:37:05.459	t	1	2026-03-21 01:27:05.459532
2546ca41-ebe2-428c-a77b-fa8cb6611e02	susking1994@gmail.com	023032	2026-03-24 19:53:12.124	t	1	2026-03-24 19:43:12.125078
b6900d00-5fbb-42d4-a712-1fb096c2a686	jodiejoe214@gmail.com	849047	2026-03-21 02:14:38.385	t	1	2026-03-21 02:04:38.386994
adea6c64-7883-4fc9-9e09-a620ebd4a787	youknowkevin9@gmail.com	211027	2026-03-21 04:08:59.668	t	1	2026-03-21 03:58:59.669161
f50821ea-4253-4ac4-955b-49919c8c30ec	Funtogether2001@gmail.com	508166	2026-03-21 15:28:54.552	t	1	2026-03-21 15:18:54.553403
170a683e-6f30-46f2-ae7b-daf775208dd0	sissyslutlily@yahoo.com	353964	2026-03-21 15:33:51.561	f	0	2026-03-21 15:23:51.562147
19ab1dd1-cc53-41ba-8e4d-0e9b58de928c	travoisp@gmail.com	191125	2026-03-21 18:32:39.829	t	1	2026-03-21 18:22:39.830614
9c616a0e-7e21-4341-b846-f4ef09913e80	randall@randallaustin.com	523751	2026-03-21 19:32:07.435	t	1	2026-03-21 19:22:07.436728
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."Message" (id, sender_email, receiver_email, recipient_email, content, read, is_read, conversation_id, attachment_url, created_date, updated_date, deleted_for) FROM stdin;
c6cb9016-27d9-4e8c-a4b1-7b0e3b9ffced	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	t	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-17 09:58:17.658658	{}
5dd8240a-0dd0-47ce-b16f-8ea302a9fd32	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	t	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:58:17.659163	{}
5ea1d0d8-c5dc-4f4e-a50e-8e853aba32eb	blackpagevideo1@gmail.com	Nashville52002@yahoo.com	Nashville52002@yahoo.com	deleted_for schema check	t	f	\N	\N	2026-03-12 21:12:47.28934	2026-03-13 01:11:55.84871	{blackpagevideo1@gmail.com}
a41ffe02-3548-4d1f-97f7-0258b73792e1	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **New Updates**\n\nWe are doing new updates.	t	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-17 19:13:16.345265	{}
48bafa07-1fd5-4b86-b1c6-a71068df8fbf	blackpagevideo1@gmail.com	Nashville52002@yahoo.com	Nashville52002@yahoo.com	deleted_for schema check	t	f	\N	\N	2026-03-12 21:13:03.250112	2026-03-13 01:12:02.887846	{blackpagevideo1@gmail.com,Nashville52002@yahoo.com}
900f1c2e-ae2b-42e1-a110-0b402ced5839	blackpagevideo1@gmail.com	danishrehman78677@gmail.com	\N	Can 	t	f	\N	\N	2026-03-13 00:18:42.838596	2026-03-13 16:21:10.118971	{}
6a475694-8e37-4e31-a9f8-845205b31126	blackpagevideo1@gmail.com	danishrehman78677@gmail.com	\N	Hello	t	f	\N	\N	2026-03-13 05:02:27.592535	2026-03-13 16:21:10.129456	{}
e4ad6f40-6a6c-4768-b3ef-b0ad6c6f0ba5	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-17 18:00:18.893025	{contact@popupplay.fun}
1b0a4132-8281-4781-9193-a95c26640ac6	danishrehman78677@gmail.com	danishcreates786@gmail.com	\N	mmm	t	f	\N	\N	2026-03-13 16:22:35.12281	2026-03-13 16:23:14.2592	{danishcreates786@gmail.com}
39806e6b-c47d-4243-bafe-fd655462754b	saicharan.629@gmail.com	blackpagevideo1@gmail.com	\N	Hey	f	f	\N	\N	2026-03-13 22:24:04.570955	2026-03-13 22:24:04.570955	{}
3dbaa902-f4f4-476c-8b1d-1247beefbf9b	saicharan.629@gmail.com	contact@popupplay.fun	\N	Hey	t	f	\N	\N	2026-03-13 22:24:26.048976	2026-03-13 22:25:53.219504	{}
0b9afa04-f377-4620-adc8-6517ea98db0c	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-17 18:00:24.842229	{contact@popupplay.fun}
40bbd4db-e364-49d3-971d-f014f60f8a0d	danishrehman78677@gmail.com	danishcreates786@gmail.com	\N	hey	t	f	\N	\N	2026-03-14 04:35:46.256321	2026-03-14 04:35:54.455908	{}
150f182e-7cbf-4a4a-b79a-58f71dc0b4c1	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
c04d2b13-b57d-4c04-af6a-17e8c5cb3c29	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
07822681-736c-486b-97d0-42f368b0eec6	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
c873a655-01ee-43ab-99de-52a60b3995f8	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
98be778d-cec4-4bb2-b5ae-dc51019e9aae	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
ed451a6d-e8bf-4157-80b9-3618566ada7d	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
5724ac52-beda-41fa-a9c4-0ea354224b41	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
6dac81dd-2cb6-4cb2-be64-f7c875064809	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
a178fc12-6816-4fd6-ae41-ff348dc639da	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	t	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-17 18:00:35.580395	{contact@popupplay.fun}
ddd013ba-c8e2-4b7c-9e81-367a0af6d5df	saicharan.629@gmail.com	Nashville52002@yahoo.com	\N	Hey	t	f	\N	\N	2026-03-13 22:23:41.226416	2026-03-17 19:13:11.903237	{}
3fc11e7f-c328-40f8-8eb7-7127cff9e5b9	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	t	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 19:13:16.407654	{}
68f3aafc-b9e8-4cf7-8f4b-f12b8c120de0	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	t	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-22 21:02:49.739616	{}
c56f2849-afca-4fe9-969b-4d77012dd2b0	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	t	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-22 21:02:49.744429	{contact@popupplay.fun}
be430c3a-a2ca-43b1-b1cf-385a494505f8	contact@popupplay.fun	saicharan.629@gmail.com	\N	Hey	t	f	\N	\N	2026-03-14 00:44:40.819924	2026-03-22 21:02:49.763731	{contact@popupplay.fun}
5f59b3da-6d54-41c8-b342-5db6185a7891	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
6cdae6c2-48bc-49d6-9e69-a2cb0e74264a	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
83feafa6-2bb3-41d5-b868-b2075f9ca441	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
b312e734-194f-47fb-9244-8b640108bb35	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
6b270e16-03b9-4dff-8e8f-7d12a058ba47	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
c7b775ec-635c-4fe2-aaf8-8b6f7bf07292	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
a5c2b0b8-b931-40ed-b4ca-d7b2d707fa5a	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
289a391b-a04f-45bc-91f0-5ea1741b8598	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
12a1fb4f-8e77-456e-b1a6-d90b6a068634	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
c1c4a55c-67b3-4ff4-a0fd-8e3f4cd23f0a	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
be2e71ba-4cac-46d8-becc-a0e838383671	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
0764494c-9370-4456-8f2a-5cb227fb3df4	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
d7153860-6989-4c5d-b593-6ec74b129bdc	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
5c180cb8-121a-4131-9e44-ccc855f8233d	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
3fd2254e-07fc-4a21-a1c8-26a6d20e48b5	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
e4772861-eb90-4961-a0a4-1e2065702097	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
aa4e1286-5fdb-4590-87ab-33ddaa8327bb	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
33372481-cf44-4ce3-bd80-d94419785c6a	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
6af981e3-80d7-452f-9310-6ca6556cef16	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	t	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 19:13:16.38082	{}
e94ea82d-ae7a-4f56-8ad5-8d8b118bcc54	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 18:00:19.132307	{contact@popupplay.fun}
4dafcca3-1c1f-4613-8012-bc3adf4400f1	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 18:00:24.964044	{contact@popupplay.fun}
1a8f6341-fb2a-45bb-916c-cc00ded46305	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 18:00:25.124314	{contact@popupplay.fun}
27c9e14e-abee-4cb7-8fe2-5a9c283159db	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	t	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 18:00:35.705387	{contact@popupplay.fun}
d1937501-0034-46ff-90c3-7b2d48054960	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	t	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-18 10:43:51.96129	{}
eb77b9b4-398c-47b2-8509-92e10f4932bb	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	t	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-18 10:43:51.966486	{}
980965a3-db30-4c0c-8834-d4a086ed51c0	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	t	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-20 15:16:08.521145	{}
c8994972-8a54-4e74-96fc-5292ce88e301	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	t	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-20 15:16:08.523102	{}
22e9ba1e-4a93-4cdb-8ae6-33c17add06e2	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	t	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-22 21:02:49.765224	{}
66737613-e07e-487a-a8de-26d14fd2d0c7	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	t	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-22 21:02:49.767537	{}
a4f18a05-425a-402c-b62e-1a1da192a18e	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
25c34bc1-2e41-4c2f-8c41-3225e9f2231b	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
be870a03-5152-4258-ac5c-1e2e6369bc09	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
1e63f084-e451-4372-b5be-326065f1a459	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
860a36f4-26d6-4183-878b-f20deb2d0693	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
0be24ae7-ad3b-4848-afb3-82756e0a7c43	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
90f12b21-b554-4500-8b65-80a0ab7e44c4	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
a184b711-c2ff-4e61-bf0f-9817cb7c2a33	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
0ddfda3f-e990-4aaf-8cba-0e47226beeed	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
a4b60769-8b16-4388-ade3-c055be3a3d0d	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
81ea1eab-f7d1-4863-9705-271ba0f53ba3	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
8564729e-f1c7-4bf0-8b76-d3f83bd67549	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
6e22b860-6fa8-4a44-87e1-b18b84d19d6f	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
8e1db37e-a9d9-419d-90cf-1ea3d9e2597b	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
03e9a6e9-a983-44bc-af68-b929e4f9ddad	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
a0e43e58-ed31-4c4d-bd4d-2d72c1f3f313	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
6beaddcb-f71f-4a49-8374-44f54aa6101c	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
0bb7c515-07da-4038-b502-9f70c78acf79	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
952a39c0-474c-45ed-812f-ca9aca538488	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
4fd5f17d-9517-46a4-ba4d-fcc91e355690	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
9b26484b-97ae-4ddd-9c7d-00ae006a602d	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
09bf80a8-bd7a-44a4-a9de-69bfa25cd213	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
7a4d7c24-dfd3-40b9-a463-cb05cd2eeea3	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
bc67ac98-64e4-4be0-b123-4e39d19a0e66	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
c633a023-12d0-4941-a3a8-c9ff68eb5633	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **Broadcast Email Test Manual**\n\nmanual test	t	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 19:13:16.384692	{}
ad656f95-9a59-4bee-ae9c-f901ff50dc78	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **test**\n\ntest	t	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 19:13:16.407652	{}
02505546-5c2f-4934-8898-15623cf689cb	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 18:00:19.460547	{contact@popupplay.fun}
a0d9988e-f9fb-4c77-a10c-3e1b2550f899	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 18:00:19.567022	{contact@popupplay.fun}
24d2cd30-6324-4ccb-ba96-a75e9bfd7f53	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 18:00:25.226348	{contact@popupplay.fun}
8af1b01d-085e-4e9a-a13a-a2587a61a423	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 18:00:25.339	{contact@popupplay.fun}
0db3834e-55fc-4cdd-b436-de1711609611	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **test**\n\ntest	t	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 18:00:35.825326	{contact@popupplay.fun}
c9a404e9-e5f8-4d8f-b27e-901704b051e9	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **Broadcast Email Test Manual**\n\nmanual test	t	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-18 10:43:51.964939	{}
e2e7e12f-3095-450c-a334-a5fdbf8f45e0	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **Broadcast Email Test Manual**\n\nmanual test	t	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-18 10:43:51.966335	{}
9f59f03f-585e-4ce2-94df-febd418dabbd	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	t	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-20 15:16:08.525126	{}
b6b9a335-25a1-44e5-8eb5-2d59871cb642	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	t	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-20 15:16:08.528913	{}
ad81bbec-b1b0-4d67-b597-a8382c7cf185	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	t	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-22 21:02:49.741601	{}
440555e4-16c5-4fef-b758-a99f2582ef93	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
0da867a4-3372-4877-b5cc-f5f71696d5e0	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
d32feb15-185e-4974-a82b-cc84fcd96dbe	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
cdc38757-29c3-45ee-9a40-19f3dc2c28d9	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
0216c2d2-bcf3-42ae-a508-4d53b878691f	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
49ec7f9f-c080-4f6c-b426-f833fe4b4121	danishrehman78677@gmail.com	danishcreates786@gmail.com	\N	hey	f	f	\N	\N	2026-03-17 10:13:34.645932	2026-03-17 10:13:34.645932	{}
ff325443-226d-48a7-bf16-98843c03a8ab	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 18:00:19.238422	{contact@popupplay.fun}
e227983c-87d0-4812-9f48-de0dff7f19a6	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 18:00:19.355131	{contact@popupplay.fun}
d3ac4b2b-142c-430a-95f2-10b3f6bd7ca5	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 18:00:25.454121	{contact@popupplay.fun}
673d46fc-8bc7-478e-b077-9c2411220b1e	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	t	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 18:00:35.930983	{contact@popupplay.fun}
33a8227b-97ad-40d5-bd46-9c57d9b96b5a	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	t	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 18:00:36.038315	{contact@popupplay.fun}
bad47743-e949-43e8-8e29-5347f193b2a4	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	t	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 18:00:36.144029	{contact@popupplay.fun}
9dee66ae-06fc-4a6e-849b-fd7eb39385e3	contact@popupplay.fun	blackpagevideo1@gmail.com	\N	Test 	f	f	\N	\N	2026-03-17 19:00:13.756103	2026-03-17 19:00:13.756103	{}
fb3fb6a4-8835-426b-b99a-b9961181a846	Nashville52002@yahoo.com	blackpagevideo1@gmail.com	\N	Test	f	f	\N	\N	2026-03-17 19:10:41.092674	2026-03-17 19:10:41.092674	{}
5b282a1d-0110-4cd4-b68e-2e1dd30f2b64	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **Broadcast Email Test Manual**\n\nmanual test	t	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 19:13:16.382328	{}
e26a32f1-fc6d-4914-b681-9fc6124a9206	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **test**\n\ntest	t	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-18 10:43:51.963204	{}
03c82980-c95a-4c0f-b16a-d3c0080be0fc	mnrealestate11@yahoo.com	donalddump77@gmail.com	\N	Hey!  We're considering a BBC for her first time.... how big are you? 	t	f	\N	\N	2026-03-18 10:37:38.859674	2026-03-18 11:38:18.20115	{}
809450b3-0693-453a-9d3b-0bab238d07d8	donalddump77@gmail.com	mnrealestate11@yahoo.com	\N	Do you have fetlife ?	t	f	\N	\N	2026-03-18 11:38:32.191595	2026-03-18 22:23:57.788731	{}
a761ea76-c31c-4c5e-9df5-9221662a28fe	donalddump77@gmail.com	mnrealestate11@yahoo.com	\N	https://fetlife.com/bbcthugg	t	f	\N	\N	2026-03-18 11:39:36.49286	2026-03-18 22:23:57.790634	{}
4677513c-b6f7-40f3-9a57-c5f45b6879e9	donalddump77@gmail.com	mnrealestate11@yahoo.com	\N	Picture and videos are on my fet 	t	f	\N	\N	2026-03-18 11:39:58.035648	2026-03-18 22:23:57.790923	{}
b32af87c-da93-435e-8e22-5194918bbbef	bigboo87_05@yahoo.com	Nashville52002@yahoo.com	\N	Hello beautiful do you visit dallas	f	f	\N	\N	2026-03-20 00:25:38.802603	2026-03-20 00:25:38.802603	{}
5e140179-2f7d-4248-a82c-5f03837ccea1	bigboo87_05@yahoo.com	blackpagevideo1@gmail.com	\N	Hello beautiful 	f	f	\N	\N	2026-03-20 00:26:26.240652	2026-03-20 00:26:26.240652	{}
02c458c5-32d8-4335-935d-d33aa89459c2	bigboo87_05@yahoo.com	domsammie02@gmail.com	\N	Good evening beautiful 	f	f	\N	\N	2026-03-20 00:28:49.539847	2026-03-20 00:28:49.539847	{}
d01f1de1-1eed-479b-b9e6-d91388356f36	contact@popupplay.fun	stevenjohnsontx90@gmail.com	stevenjohnsontx90@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
55ca2469-003a-46bb-9483-15be13f8b10e	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
c608172e-cf96-4270-bce4-d92a4a449841	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
7caf69eb-db07-47ae-a254-b82b9f777e98	contact@popupplay.fun	kqofhearts420@gmail.com	kqofhearts420@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
bde5c458-085f-4232-b781-aa4705206dc3	contact@popupplay.fun	jnightmare15@gmail.com	jnightmare15@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
303829df-8e52-4b62-8595-1d07d313fa56	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **test**\n\ntest	t	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-20 15:16:08.52691	{}
e02cd48f-299a-45b7-8d1c-c0cfc64f4658	mnrealestate11@yahoo.com	donalddump77@gmail.com	\N	Feel free to send some pics through here 	t	f	\N	\N	2026-03-18 22:26:23.265825	2026-03-20 20:10:54.493487	{}
1158881a-957c-4e47-abde-fc1e232a03f6	mnrealestate11@yahoo.com	donalddump77@gmail.com	\N	We do not have fetlife 	t	f	\N	\N	2026-03-18 22:24:28.487249	2026-03-20 20:10:54.493062	{}
ed0d5442-2998-4110-a9d5-933ee9a8f367	bigboo87_05@yahoo.com	mnrealestate11@yahoo.com	\N	Hello guys yall looking to have fun anytime soon 	t	f	\N	\N	2026-03-20 00:31:48.070177	2026-03-22 19:40:10.071188	{}
67ba7907-61de-4b6f-a292-4fc575470741	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	t	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-22 21:02:49.748441	{}
932a8125-0bf9-4d5c-abe4-b96ce1108438	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
929222b5-d5d3-4054-8529-f0f66413df44	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
d8eb4479-54e4-42f2-a544-c8008c71465a	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
26f0d45b-264b-4ec2-a809-877ff926ed0c	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
d1c19970-6aca-49c8-995f-18fa3a4ec1f2	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
974ca9f0-418f-4823-8b00-2394aaef6a1d	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
0fa3323d-0d35-4753-bebe-17d782e9a5c1	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
40ef46ae-d8ce-4c2c-829b-418865e6ec5c	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
27b59543-328d-4528-b501-990991360349	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
82e51424-bfcb-44d5-b5e7-79187c89e575	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
8b77fdc7-a804-4500-af4a-fdfcb0dde899	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
5967d57a-3d81-423c-a66e-a3a83cbc9118	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
43f2e36c-d0bc-4442-a230-6e4201147257	contact@popupplay.fun	cfpeters17@gmail.com	cfpeters17@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
3795d352-6a68-4afc-b41f-209fa52607d5	contact@popupplay.fun	Im1badman7@yahoo.com	Im1badman7@yahoo.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
3188c694-2058-4b88-83ca-e2841988fa8d	contact@popupplay.fun	bbcn314@yahoo.com	bbcn314@yahoo.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
ad00d7d7-b8c1-4e91-970a-3f468b8202ce	contact@popupplay.fun	bigboo87_05@yahoo.com	bigboo87_05@yahoo.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
dd500771-65f1-4143-b219-043e7c1fa305	contact@popupplay.fun	thebookcrowns@gmail.com	thebookcrowns@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
5aff5cdf-f0f5-40a7-98c1-afef6fdc573e	contact@popupplay.fun	ttimmyturnerr62@gmail.com	ttimmyturnerr62@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	f	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 14:48:59.984154	{}
1be4202c-9911-495b-81ca-d087ff320103	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	t	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-20 15:16:08.528676	{}
3eb2add7-9959-4111-84a6-205c6a0d50c0	contact@popupplay.fun	stevenjohnsontx90@gmail.com	stevenjohnsontx90@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
b7c5b519-d050-4447-baf2-24db210a49fb	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
3227c8c9-0f90-4ebd-90ce-485ee8f90962	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
058f323a-aba2-49da-902a-46ab5eebcf21	contact@popupplay.fun	kqofhearts420@gmail.com	kqofhearts420@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
3f83b299-7e0f-4857-ae8b-b920aa684901	contact@popupplay.fun	jnightmare15@gmail.com	jnightmare15@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
3b71e8fd-74f8-406c-b5d8-fb9bb31ef8f7	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
e61f9666-ebdb-4ff5-be6b-46b30f4e7c28	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
86f5f8ee-7217-4faf-9511-30341b1f5203	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
11a2a09c-534f-4481-937a-1afd3feba21d	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
d7b139db-cadb-41a4-a010-51cc42ec8223	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
8882cb08-7e65-4998-8951-82c30f06dcfe	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
716df968-6030-4640-a8dc-66689e1d3641	contact@popupplay.fun	donalddump77@gmail.com	donalddump77@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	t	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-21 09:31:37.108206	{}
dbe38d59-1ed5-457d-a7ac-99c1cf749244	contact@popupplay.fun	bacon5693@gmail.com	bacon5693@gmail.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	t	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-21 20:50:10.729605	{}
345f59c1-e069-4639-a034-2792e16d0072	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **Updates**\n\nWe are making updates. Stay tuned.	t	f	\N	\N	2026-03-20 14:48:59.984154	2026-03-22 19:40:44.059348	{}
b4bc4630-b1e1-41cc-aa3a-67b2f958ea2c	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	t	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-22 21:02:49.750744	{}
0dd1cb83-c307-40da-a65e-59c479b0d9d3	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
691340f4-a302-4637-819b-07facb705c84	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
778c41b5-0d19-4937-94b5-61bb4e70f1b1	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
7a97e833-ace7-4299-b73a-2bc8e0a14ceb	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
807c7dc5-f367-41b4-9352-8b0a7b2ab79f	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
d5ebdf60-8efe-42f4-b49c-bdbe674b2bdb	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
0e243cdf-c30a-46dc-a1f7-8f35786250fc	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
16287cba-58b5-4b7b-9a1c-c7b03037ca12	contact@popupplay.fun	cfpeters17@gmail.com	cfpeters17@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
e36177da-b2df-46a4-93cb-d8fad39ff5b8	contact@popupplay.fun	Im1badman7@yahoo.com	Im1badman7@yahoo.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
9f371db5-eec9-480f-80f4-3c68b72821e1	contact@popupplay.fun	bbcn314@yahoo.com	bbcn314@yahoo.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
23b8c423-7ea9-4523-a921-3dd8803cf4da	contact@popupplay.fun	bigboo87_05@yahoo.com	bigboo87_05@yahoo.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
82e77982-9a6a-41cc-836d-33b78df204a5	contact@popupplay.fun	thebookcrowns@gmail.com	thebookcrowns@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
59cbf1ee-63ab-4565-80a1-da9d3ace7b7f	contact@popupplay.fun	ttimmyturnerr62@gmail.com	ttimmyturnerr62@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
b2ef33a2-5c5d-43fa-b7db-5618a3d8d2dc	contact@popupplay.fun	jodiejoe214@gmail.com	jodiejoe214@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
078df24d-67bf-4989-a683-0f3e19df8810	contact@popupplay.fun	angelofromgr@gmail.com	angelofromgr@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	f	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 02:38:19.849314	{}
102a919b-51a1-4923-89af-017e4feb5fb7	contact@popupplay.fun	donalddump77@gmail.com	donalddump77@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	t	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 09:31:37.108411	{}
937c81b0-695e-4244-a756-658f662d5833	contact@popupplay.fun	stevenjohnsontx90@gmail.com	stevenjohnsontx90@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
dd3070d3-13ce-43ad-8e42-b27a7d8ebe75	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
baa7f0e9-3326-405c-bdec-9cff1ed5809b	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
a8f1df58-96d1-4ae9-b98e-c771d09c7c0f	contact@popupplay.fun	kqofhearts420@gmail.com	kqofhearts420@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
0c2258c8-d395-4c34-a9d6-b13485a570ba	contact@popupplay.fun	jnightmare15@gmail.com	jnightmare15@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
eaaadaf5-ab28-4808-9d22-c53f87cc26bf	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
18a6ea96-a1fa-4eaf-b3de-0ff19c8cf391	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
296707e9-78f3-4df0-a754-0ddecdf6d01e	contact@popupplay.fun	kmusgrove82@aol.com	kmusgrove82@aol.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	t	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 19:34:12.396867	{}
40accefd-24eb-44ed-93db-80a41e3ce105	contact@popupplay.fun	bacon5693@gmail.com	bacon5693@gmail.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	t	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-21 20:50:10.731014	{}
85eb60f3-b558-42f4-b52a-86ee2c59fe76	donalddump77@gmail.com	mnrealestate11@yahoo.com	\N	📷 Sent an image	t	f	\N	https://popupplay.fun/api/uploads/1774085480897_e7098d4903bf08f304be4443b7885a8d.jpeg	2026-03-21 09:31:20.953169	2026-03-22 19:39:35.892319	{}
594856fa-b29a-4711-947b-d90db2da84a3	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **Bbc filming in Dallas, Tx**\n\nWe are filming in Dallas, Tx tomorrow. We need BBCs for a hot milf.	t	f	\N	\N	2026-03-21 02:38:19.849314	2026-03-22 19:40:44.058653	{}
d85a837c-6ccb-4a1f-a6b1-da75b727221d	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	t	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-22 21:02:49.75657	{}
72b3b19d-904b-4410-a862-572cbff8963a	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
fbe95ab9-fccd-429d-bbc0-90ffd383269c	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
4dd24d32-0ec2-43c4-a2b8-17fc583161e3	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
dbe1c54b-b272-4ebb-82bc-500ecc0d65c0	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
4bf7ecea-d8c1-4a9f-9f9a-f73764125226	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
d3b89737-7f01-416a-a9aa-d7ef8868dfef	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
93aed385-e6eb-4a27-9cf2-2e155b60cca1	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
672e1e50-35e3-4f58-9436-4d33cb83ac7a	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
d967accb-7c83-4d16-901a-59651738d1c9	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
c0573c2f-78ca-41a0-9915-921ad9794546	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
53a8336a-6f0f-4657-a9f3-8f4fc97b80a1	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
5171a409-d24b-4be7-a504-3bf5172ba8c6	contact@popupplay.fun	cfpeters17@gmail.com	cfpeters17@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
96fbce2a-8a9d-44f0-8056-c92842d1b92b	contact@popupplay.fun	Im1badman7@yahoo.com	Im1badman7@yahoo.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
689ae752-1217-4393-a5c5-1417ef9acb05	contact@popupplay.fun	bbcn314@yahoo.com	bbcn314@yahoo.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
d56fdbfc-d8e1-470f-b624-c4bac98a71fc	contact@popupplay.fun	bigboo87_05@yahoo.com	bigboo87_05@yahoo.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
c0536fef-be56-4000-8f6b-80709dac8761	contact@popupplay.fun	thebookcrowns@gmail.com	thebookcrowns@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
897ca400-e8a8-474b-b9e5-66de2465d920	contact@popupplay.fun	ttimmyturnerr62@gmail.com	ttimmyturnerr62@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
0f91a210-a273-48c1-813f-21149a0ab71a	contact@popupplay.fun	jodiejoe214@gmail.com	jodiejoe214@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
04237c7c-06ac-4a38-9a29-c71ce8df5560	contact@popupplay.fun	angelofromgr@gmail.com	angelofromgr@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
9aa34519-5152-41f8-823e-c848af2f5d31	contact@popupplay.fun	bacon5693@gmail.com	bacon5693@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	t	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 20:50:10.731159	{}
15b56545-0b19-47ca-9d13-f7ff82266a3c	contact@popupplay.fun	bbcn314@yahoo.com	bbcn314@yahoo.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
b3d5da8b-cce9-4ddf-80c0-98f646ae34bc	contact@popupplay.fun	bigboo87_05@yahoo.com	bigboo87_05@yahoo.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
801cb3a7-55e4-4a6d-b791-f105e9051b0c	contact@popupplay.fun	donalddump77@gmail.com	donalddump77@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	t	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-22 05:22:36.807661	{}
848b6788-1381-41e4-b232-18507729b692	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	t	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-22 19:40:44.055436	{}
f2c26716-f6a3-482b-9c76-8460e69bff27	contact@popupplay.fun	bevo2169@gmail.com	bevo2169@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	t	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-23 01:21:39.124486	{}
8e8ead8d-db46-473a-8935-d1d7fd93f307	contact@popupplay.fun	bighomiie5150@gmail.com	bighomiie5150@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	t	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-23 19:18:25.88604	{}
814bef68-0589-4bb9-899e-2398f2a189b0	contact@popupplay.fun	Funtogether2001@gmail.com	Funtogether2001@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
33758c22-dd0e-42e7-adee-6768ffba1e9d	contact@popupplay.fun	sissyslutlily@yahoo.com	sissyslutlily@yahoo.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
ab4947ae-e5cf-46ba-8bb3-9181051effd1	contact@popupplay.fun	travoisp@gmail.com	travoisp@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
c0e952c7-c436-4f8a-88b4-af0ae03237d9	contact@popupplay.fun	randall@randallaustin.com	randall@randallaustin.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	f	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:31:52.608937	{}
f28c1d98-588e-441f-884a-36bad9b509c7	contact@popupplay.fun	kmusgrove82@aol.com	kmusgrove82@aol.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	t	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-21 19:34:12.396989	{}
dfdb6137-13d7-4bbf-94d8-7feef40262e7	bacon5693@gmail.com	blackpagevideo1@gmail.com	\N	Hey 	t	f	\N	\N	2026-03-21 20:50:01.639278	2026-03-21 20:54:25.264843	{}
965a9bf7-e021-45b5-9970-df0fa05e7ab5	contact@popupplay.fun	stevenjohnsontx90@gmail.com	stevenjohnsontx90@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
d67afa08-1c03-4481-95f3-496db951b25e	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
68c8cc5a-b738-4776-af1c-d951cbecbec0	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
528c5f9c-fcb5-4fa4-a288-ccd5484e95ed	contact@popupplay.fun	kqofhearts420@gmail.com	kqofhearts420@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
9c917191-30d9-40df-82e2-e99e227c75bc	contact@popupplay.fun	jnightmare15@gmail.com	jnightmare15@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
6bdb4185-1511-42fe-a778-86c8149407d6	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
d9e3bdfd-a24b-4636-9ae1-bcaee24187df	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
d84ae1d2-0082-484a-b274-ad5d630eea05	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
e3f968b9-6f01-427e-8d30-c84f985fddbd	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
68e5bd33-acaf-42a2-9112-8dc308eb1211	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
9f2de637-34e5-4e6c-a967-bcada9b0051e	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
26dc98d4-71d4-4bcc-b90b-b511caf0c47d	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
2eb23143-f531-4c62-9ee9-9eeae269d4fd	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
5eb0cf9d-7b3e-4702-a010-d5395debff7d	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
fd7e78f8-2c9b-48f6-80c0-6fd161bbcdec	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
b5df23a9-8f47-4934-bb46-4da0ab3fcbe9	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
a572d35f-d406-4d25-8fa0-eab04e67052c	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
9b1a3e1d-a888-4380-bd50-b3676bda43b8	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
9b504735-1d62-471a-ac82-6d5d40306d8a	contact@popupplay.fun	cfpeters17@gmail.com	cfpeters17@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
1d01586e-8d7f-4d5d-b769-b478dcae1d18	contact@popupplay.fun	Im1badman7@yahoo.com	Im1badman7@yahoo.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
d4bafaa0-e1f9-4ee2-803c-66d20817549c	blackpagevideo1@gmail.com	bacon5693@gmail.com	\N	We are filming tonight in Dallas 	t	f	\N	\N	2026-03-21 20:54:42.952846	2026-03-22 05:15:06.739605	{}
6dced385-6429-4970-b8b4-c0ba48ed8d56	blackpagevideo1@gmail.com	bacon5693@gmail.com	\N	Hey	t	f	\N	\N	2026-03-21 20:54:28.615098	2026-03-22 05:15:06.739359	{}
9aa1da24-9899-4e15-8366-00e42f709f2d	contact@popupplay.fun	donalddump77@gmail.com	donalddump77@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	t	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 05:22:36.806755	{}
9ec3cb82-39f5-4d85-a8ce-3efb5ed4b864	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	t	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 19:40:44.057258	{}
6959e30d-b3d3-4af1-b50a-a817c8b5e918	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	t	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 21:02:49.755255	{}
d68ab082-6508-488c-a0ce-c1b2b884ae85	contact@popupplay.fun	thebookcrowns@gmail.com	thebookcrowns@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
a59e22f4-01df-4bce-9d56-fd90e8f2b69b	contact@popupplay.fun	ttimmyturnerr62@gmail.com	ttimmyturnerr62@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
a7e6907a-aead-454d-9a50-4c3bb90aacd4	contact@popupplay.fun	jodiejoe214@gmail.com	jodiejoe214@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
13841789-8ca7-46ed-bce6-88e0eaf45c13	contact@popupplay.fun	angelofromgr@gmail.com	angelofromgr@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
e01b3545-f8ad-40fd-9d21-1c61219ffa09	contact@popupplay.fun	Funtogether2001@gmail.com	Funtogether2001@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
8c4445d4-cad5-471f-a984-6c1e765f0f58	contact@popupplay.fun	sissyslutlily@yahoo.com	sissyslutlily@yahoo.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
ab5ad678-b57f-445d-a060-166f531d247e	contact@popupplay.fun	travoisp@gmail.com	travoisp@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
48f701c9-54db-498c-9cf7-29a08878c2e2	contact@popupplay.fun	randall@randallaustin.com	randall@randallaustin.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
64a33c75-9a14-485d-b0f6-587af2c621be	contact@popupplay.fun	jjroman1974@gmail.com	jjroman1974@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
1e207bda-1c80-44fd-97ea-50bcde37ea85	contact@popupplay.fun	mdg476121@hotmail.com	mdg476121@hotmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
54b4a431-8d51-43e1-88d4-875c4cc9e2f6	contact@popupplay.fun	gonzo1795@yahoo.com	gonzo1795@yahoo.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
e2e99bd9-b218-45cd-9985-71de14dee33a	contact@popupplay.fun	pbaudot@umich.edu	pbaudot@umich.edu	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
9a6c113a-995c-4ccc-8c7c-524808d5ffcc	contact@popupplay.fun	ccaprirolo@gmail.com	ccaprirolo@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	f	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 00:57:27.128795	{}
80c45ef3-fe7e-4095-8366-41785ba7498f	contact@popupplay.fun	youknowkevin9@gmail.com	youknowkevin9@gmail.com	📢 **Dallas, Tx BBC Party Address**\n\nThis is the hotel Popupplay.fun will film at tonight.\n\nhttps://maps.app.goo.gl/EX3K19Ghm3FsuwN67?g_st=a	t	f	\N	\N	2026-03-21 19:31:52.608937	2026-03-22 01:14:00.697207	{}
f27d77bb-6085-4564-ac1f-65ba76329af4	contact@popupplay.fun	youknowkevin9@gmail.com	youknowkevin9@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	t	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 01:14:00.697346	{}
23e7b922-00ff-45c6-88ae-598ca3bc88e7	youknowkevin9@gmail.com	ccaprirolo@gmail.com	\N	Hello and happy Saturday night 	f	f	\N	\N	2026-03-22 01:15:26.322931	2026-03-22 01:15:26.322931	{}
0f54bdea-d3cb-43cf-b96f-38ec3c5d39e0	contact@popupplay.fun	bacon5693@gmail.com	bacon5693@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	t	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 05:14:46.280598	{}
2108d945-5fe6-4f17-b57b-ed471ca7dfe8	jannylovesyou2@gmail.com	blackpagevideo1@gmail.com	\N	Hello bbc bull here at quality inn	f	f	\N	\N	2026-03-22 13:37:31.517715	2026-03-22 13:37:31.517715	{}
05f25d4f-9f66-4197-93a6-6076a2cab5d3	jannylovesyou2@gmail.com	contact@popupplay.fun	\N	Hello , I’m currently at quality inn, bbc bull here and ready 	t	f	\N	\N	2026-03-22 13:37:05.727147	2026-03-22 13:38:28.642683	{}
f582e785-02ed-48a6-bb5e-a55b555b36d2	contact@popupplay.fun	jannylovesyou2@gmail.com	\N	📷 Sent an image	t	f	\N	https://popupplay.fun/api/uploads/1774186725299_ac4068a645825b5e9615ce0723ae7244.jpeg	2026-03-22 13:38:45.403283	2026-03-22 13:38:50.607823	{}
95c1abe5-6f44-408e-b415-362e11976ce8	contact@popupplay.fun	jannylovesyou2@gmail.com	\N	The party was last night 	t	f	\N	\N	2026-03-22 13:38:36.314063	2026-03-22 13:38:50.607692	{}
15df0608-ac21-4369-9b40-aea434753952	contact@popupplay.fun	jannylovesyou2@gmail.com	\N	📷 Sent an image	t	f	\N	https://popupplay.fun/api/uploads/1774186743510_884dfc44955a1ffcf31b81630aef7cab.jpeg	2026-03-22 13:39:03.615431	2026-03-22 13:39:09.771557	{}
3739ba8d-c1a2-4015-88bc-8860facde3ac	jannylovesyou2@gmail.com	contact@popupplay.fun	\N	Does anyone more bbc this morning? 	t	f	\N	\N	2026-03-22 13:39:33.578232	2026-03-22 13:40:06.12408	{}
199fb640-c281-452c-96db-b17e676a5b1b	jannylovesyou2@gmail.com	contact@popupplay.fun	\N	📷 Sent an image	t	f	\N	https://popupplay.fun/api/uploads/1774186809558_dc72f74ad071f99b63c4e6349ba22e3e.jpeg	2026-03-22 13:40:09.664672	2026-03-22 13:40:11.58362	{}
ac07bb3a-4f6c-41df-8987-d22e513d02c4	contact@popupplay.fun	jannylovesyou2@gmail.com	\N	Will shoot next week or soon	t	f	\N	\N	2026-03-22 13:42:34.610972	2026-03-22 13:42:47.867966	{}
396cd655-e6ea-4751-b880-16e09ea57af5	jannylovesyou2@gmail.com	contact@popupplay.fun	\N	Ok please pass the word in case any couples need a bull this morning, I’m on the 4th floor rock hard 	t	f	\N	\N	2026-03-22 13:44:02.299001	2026-03-22 13:47:33.097622	{}
27677a47-2e71-4510-a36a-82c3230063de	contact@popupplay.fun	jannylovesyou2@gmail.com	\N	Ok	t	f	\N	\N	2026-03-22 13:50:55.434436	2026-03-22 13:55:54.268186	{}
b05a9fac-091f-46fb-9162-c7f04935e115	contact@popupplay.fun	kmusgrove82@aol.com	kmusgrove82@aol.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	t	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-22 18:22:12.485492	{}
9235238e-8e40-4620-a568-8970dbb7d8f3	donalddump77@gmail.com	mnrealestate11@yahoo.com	\N	📷 Sent an image	t	f	\N	https://popupplay.fun/api/uploads/1774085940058_12f07db833c3e2a93671404c5b7c2731.jpeg	2026-03-21 09:39:00.115382	2026-03-22 19:39:35.893632	{}
98da9a37-25f4-4509-bb4e-a8ba00b2489a	donalddump77@gmail.com	mnrealestate11@yahoo.com	\N	???	t	f	\N	\N	2026-03-22 19:37:52.809796	2026-03-22 19:39:35.894411	{}
78684df9-e70b-4d03-9664-77183ed5dbc3	mnrealestate11@yahoo.com	bigboo87_05@yahoo.com	\N	Hello - where are you located? 	f	f	\N	\N	2026-03-22 19:40:59.650627	2026-03-22 19:40:59.650627	{}
2df8b52a-79df-47ad-9e99-8a0785adf80d	contact@popupplay.fun	danishcreates786@gmail.com	\N	Hey	f	f	\N	\N	2026-03-22 21:52:53.001106	2026-03-22 21:52:53.001106	{}
879407e7-8452-42e6-8fad-561b4aacee3f	contact@popupplay.fun	bevo2169@gmail.com	bevo2169@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	t	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-23 01:21:39.127608	{}
2263f96b-9c9f-48bb-a1e9-3c8fecad3bdc	mnrealestate11@yahoo.com	donalddump77@gmail.com	\N	Thats a big cock!  I don't think that will fit!  	t	f	\N	\N	2026-03-22 19:42:36.095075	2026-03-23 10:49:40.971701	{}
3dd6c41c-c1be-4525-be7c-fad913538276	contact@popupplay.fun	stevenjohnsontx90@gmail.com	stevenjohnsontx90@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
0f3c04c4-ef8a-4255-9b23-3d8cf5229250	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
50352577-5475-48ea-a5cc-243b60075287	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
eb2ef197-b7a5-4ee1-b622-2b8803bad2b3	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
972e97cb-4bdc-49fb-827f-fcf03b67b0dc	contact@popupplay.fun	kqofhearts420@gmail.com	kqofhearts420@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
061a67e0-26a2-417b-b220-ca9e1b5ddea9	contact@popupplay.fun	jnightmare15@gmail.com	jnightmare15@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
7af6316d-66ea-46f9-8057-fe4da1afbd7c	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
edfb0499-c12c-4f65-9ce4-ee0f7d4bcec8	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
a7333425-c1f3-48e0-a2c9-96c92c80482f	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
4d6f7d43-213d-4f9d-a04f-33cf6ec843da	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
713df2aa-860b-47a9-af37-1f78458ec0d1	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
de8c86fa-9d24-4b6f-aa27-1507142aad6b	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
e44e167e-e698-4dd1-8193-67a7c5f6c931	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
dc338710-355f-463e-91e5-fda14c51436d	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
3574ff8b-e1bd-4ea6-a4a1-7b8bad554ffe	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
ec3c257e-a098-4109-bcc7-2180a9a0b9c2	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
74e72430-a71a-4a98-b69f-a5621506dc55	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
42546fa0-0aad-4231-a29a-929e0fba884b	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
83304a2f-a1a4-4567-9ea3-e4ee9a9396ef	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
9c2b0fa5-ddb4-452e-a453-7a8cfbb3ea60	contact@popupplay.fun	cfpeters17@gmail.com	cfpeters17@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
5034f7dd-3350-48b7-be46-5d9d2d7a1acb	contact@popupplay.fun	Im1badman7@yahoo.com	Im1badman7@yahoo.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
e4529cd6-b3da-444f-bb71-58044e818d4c	contact@popupplay.fun	donalddump77@gmail.com	donalddump77@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	t	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-24 07:28:13.277136	{}
673ccfd5-0f76-4d31-a325-9cbd6cdbef0f	contact@popupplay.fun	bbcn314@yahoo.com	bbcn314@yahoo.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
8026f15c-8b9c-470c-ac0a-db267de481e5	contact@popupplay.fun	bigboo87_05@yahoo.com	bigboo87_05@yahoo.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
4f2a350b-ed48-430b-a11e-2cb1bf1aeae9	contact@popupplay.fun	thebookcrowns@gmail.com	thebookcrowns@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
f9bea20e-35ff-4780-862a-39e6476cb2c8	contact@popupplay.fun	ttimmyturnerr62@gmail.com	ttimmyturnerr62@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
b2d471e0-6861-401c-95f7-5e66d2716c82	contact@popupplay.fun	kmusgrove82@aol.com	kmusgrove82@aol.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
2464d87c-4632-45fa-874c-cb334b86a76e	contact@popupplay.fun	jodiejoe214@gmail.com	jodiejoe214@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
9f6cf24a-e118-4864-a105-2718b8e0caa6	contact@popupplay.fun	angelofromgr@gmail.com	angelofromgr@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
51ef6eca-d82b-4a64-a50f-b337bc3f61f8	contact@popupplay.fun	Funtogether2001@gmail.com	Funtogether2001@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
2a6ef136-2659-4490-a2fb-e1a16b697e7b	contact@popupplay.fun	sissyslutlily@yahoo.com	sissyslutlily@yahoo.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
9b306101-ebc8-4278-bce1-14e072abf966	contact@popupplay.fun	travoisp@gmail.com	travoisp@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
006bd021-6f34-4fe7-a82f-61172f1b2985	contact@popupplay.fun	randall@randallaustin.com	randall@randallaustin.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
4adf6bff-afd2-4c22-9d63-23ab86a6ff27	contact@popupplay.fun	jjroman1974@gmail.com	jjroman1974@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
adcde121-9d35-4207-9865-3e5ff2e41cd2	contact@popupplay.fun	mdg476121@hotmail.com	mdg476121@hotmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
00eb368c-1ad8-47ef-91c0-cf169077cd30	contact@popupplay.fun	gonzo1795@yahoo.com	gonzo1795@yahoo.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
75ab8232-8b5b-43e2-bd97-63631852c4aa	contact@popupplay.fun	pbaudot@umich.edu	pbaudot@umich.edu	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
87e2cac9-e2ef-478c-ad70-1a64078a0991	contact@popupplay.fun	ccaprirolo@gmail.com	ccaprirolo@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
abba7206-42ba-4040-918c-623eb5fbc008	contact@popupplay.fun	niitepaine05@gmail.com	niitepaine05@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	f	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-22 22:30:45.336447	{}
6a2ebcaa-75d9-4b54-93dd-a299fb5fe638	contact@popupplay.fun	youknowkevin9@gmail.com	youknowkevin9@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	t	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-23 00:25:51.965712	{}
7a87432e-3a34-437f-b0de-10c917d7e243	contact@popupplay.fun	bevo2169@gmail.com	bevo2169@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	t	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-23 01:21:39.127238	{}
f9f34dc8-7286-430e-a6c1-9ed887d14fdd	wildrosentx@gmail.com	blinkz4all@gmail.com	\N	You fine. Ever come to Texas?	f	f	\N	\N	2026-03-23 02:59:27.308139	2026-03-23 02:59:27.308139	{}
1de36c40-c4d1-4450-8f89-f30a3c7dfa66	wildrosentx@gmail.com	blackpagevideo1@gmail.com	\N	How can a BWC get in on the fun? 	f	f	\N	\N	2026-03-23 03:02:37.418467	2026-03-23 03:02:37.418467	{}
bbbd714a-da6e-4dbe-bf84-f7d9b0dcee58	contact@popupplay.fun	bighomiie5150@gmail.com	bighomiie5150@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	t	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-23 19:18:25.886318	{}
52e4e060-14bf-47fe-bd3d-c1d995c1c9b6	contact@popupplay.fun	bacon5693@gmail.com	bacon5693@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	t	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-24 21:02:10.615926	{}
5d8b310e-4290-4fc2-bb31-62a688d3be8e	contact@popupplay.fun	jannylovesyou2@gmail.com	jannylovesyou2@gmail.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	t	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-23 03:46:29.901591	{}
137d7162-e789-4f7f-b266-597c2c3e39f1	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **Bugs in the Software **\n\nWe are testing and improving Popupplay.fun consistently.\n\nIf you are experiencing any errors in the chat messages, send us an email \nat contact@popupplay.fun	t	f	\N	\N	2026-03-22 22:30:45.336447	2026-03-23 12:03:23.73505	{}
b43910ee-1920-475b-a064-dd9e5d761f72	contact@popupplay.fun	bighomiie5150@gmail.com	bighomiie5150@gmail.com	📢 **We need BBCs in Dallas, TX**\n\nWe need BBCs at the Quality Inn, in Dallas, TX right now!	t	f	\N	\N	2026-03-22 00:57:27.128795	2026-03-23 19:18:25.886187	{}
c729dc3d-e7a0-46bb-8ea1-3fe7c2c6c277	bighomiie5150@gmail.com	contact@popupplay.fun	\N	Hey I’m in 	t	f	\N	\N	2026-03-23 19:18:33.281069	2026-03-23 19:40:50.907805	{}
2029aa5c-bf13-4126-bbb5-5f5f160526b7	contact@popupplay.fun	bighomiie5150@gmail.com	\N	Ok	t	f	\N	\N	2026-03-23 19:41:12.22791	2026-03-24 19:49:43.055608	{}
80cf1112-0988-4923-b6b7-291f74a53691	bighomiie5150@gmail.com	contact@popupplay.fun	\N	You literally down the street from	t	f	\N	\N	2026-03-24 19:49:53.603345	2026-03-24 20:28:21.586426	{}
9d00a80c-4fee-4582-a182-cbe0ac1d60e7	bighomiie5150@gmail.com	contact@popupplay.fun	\N	Me right now 	t	f	\N	\N	2026-03-24 19:49:59.29439	2026-03-24 20:28:21.591277	{}
2f54a314-bd79-4164-bc5c-42976f81fec3	bighomiie5150@gmail.com	blackpagevideo1@gmail.com	\N	Hey 	f	f	\N	\N	2026-03-24 22:59:09.501478	2026-03-24 22:59:09.501478	{}
9856fbec-4016-4b72-af66-fae551d31b05	contact@popupplay.fun	bighomiie5150@gmail.com	\N	Hello 	t	f	\N	\N	2026-03-24 20:28:36.863703	2026-03-24 23:01:27.238669	{}
211a4979-4ca5-4773-8434-bdc31828160e	bighomiie5150@gmail.com	contact@popupplay.fun	\N	Wyd 	f	f	\N	\N	2026-03-24 23:01:32.171064	2026-03-24 23:01:32.171064	{}
\.


--
-- Data for Name: PasswordResetToken; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."PasswordResetToken" (id, email, token, expires_at, used, created_at) FROM stdin;
7a4c3e85-a521-4ebb-8b1a-814afbeebd81	youknowkevin9@gmail.com	546a6fa7ec99a809cddd9d339a0c1481ceac14dc195bfdb4fa81ae0532ab4e0d	2026-03-21 23:47:38.247	t	2026-03-21 22:47:38.247391
5e6f7ca7-2ff4-484f-ba50-fa5f16c98d0c	youknowkevin9@gmail.com	742c40deb335c73e6da4f34f12eaf356440c9a11055e413c925ca0b5dba566eb	2026-03-21 23:49:46.527	t	2026-03-21 22:49:46.528129
021d0c75-fcd4-4912-b735-88cdba887365	youknowkevin9@gmail.com	2d7bd35f2fac32beee257de1d06e3ffef66206ebc38bebcc8b05dde37f6d8aec	2026-03-21 23:51:45.482	t	2026-03-21 22:51:45.482941
0055092a-70f7-4583-8283-306d3486cdca	youknowkevin9@gmail.com	0918669e59cb442b3d1c6656691c80b1e524e94e1394e27586c594a9b6e01465	2026-03-22 01:49:41.727	t	2026-03-22 00:49:41.727461
\.


--
-- Data for Name: ProfileVideo; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."ProfileVideo" (id, user_email, video_url, caption, views, created_date, updated_date) FROM stdin;
eaa7294f-1618-4fef-983c-79ea15dc18e9	danishrehman78677@gmail.com	https://popupplay.fun/api/uploads/1773472168987_a9dfe2ad409469ab1882dc2c4016ced0.mp4	\N	1	2026-03-14 07:09:29.293393	2026-03-14 07:10:24.783716
029fa6ca-a07a-4e03-a01b-a8094862642a	blackpagevideo1@gmail.com	https://popupplay.fun/api/uploads/1773540889580_1157f27601c268c6aee895819c5a4c87.mov	\N	7	2026-03-15 02:14:49.705478	2026-03-22 14:20:44.849029
384be950-9655-4985-ac15-5df0782ab953	blinkz4all@gmail.com	https://www.popupplay.fun/api/uploads/1773482780353_5b246bf2f3b3874459413f9966fff4b5.mp4	\N	7	2026-03-14 10:06:20.640837	2026-03-24 23:00:12.540397
\.


--
-- Data for Name: Reel; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."Reel" (id, user_email, video_url, caption, duration, views, created_date, updated_date) FROM stdin;
6df7a20c-dc93-45fd-81b3-91ec196fa3b1	contact@popupplay.fun	https://popupplay.fun/api/uploads/1774205891858_6ccad4034f71c8620a110969099b2efb.mov	Amber the Sinner	55	58	2026-03-22 18:58:13.058605	2026-03-24 21:02:20.469956
fab7040c-2dc1-46da-a3f6-3601feaa5e36	blackpagevideo1@gmail.com	https://popupplay.fun/api/uploads/1773358027006_7d4d50bb4d0f354b7c5e7259a59f6356.mov		\N	262	2026-03-12 23:27:41.183261	2026-03-24 21:02:35.867337
eb0047b2-1973-4ed5-9c1f-1e372299738f	Nashville52002@yahoo.com	https://popupplay.fun/api/uploads/1773364447819_d1bccc5b8ce2687ec146027e862bcf5c.mov		\N	223	2026-03-13 01:14:10.589245	2026-03-24 21:02:38.726156
25a6eea2-95fd-447f-b5bd-0e5e06bc6a78	bear79072@gmail.com	https://popupplay.fun/api/uploads/1774318721211_7f33fb7662ff2590d8f3e74c3dc372a3.mp4	\N	82	29	2026-03-24 02:18:41.730364	2026-03-24 21:02:44.034799
78d295c3-0d3a-4f7b-a774-dcfef80ec8fe	blackpagevideo1@gmail.com	https://popupplay.fun/api/uploads/1773540889580_1157f27601c268c6aee895819c5a4c87.mov		\N	143	2026-03-15 02:14:55.654334	2026-03-24 21:02:48.904994
\.


--
-- Data for Name: SubscriptionSettings; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."SubscriptionSettings" (id, plan_name, description, monthly_price, annual_price, currency, features, created_date, updated_date, stripe_price_id, free_trial_enabled, trial_days, subscription_enabled, paypal_plan_id) FROM stdin;
1b6a1727-6444-4bbb-99b9-0f5fd26a1167	Premium	Premium Plan for Adventure,.	5.99	0.00	USD	{}	2026-03-13 16:30:01.892695	2026-03-17 10:36:20.178855	P-1NH33553PS9092637NG32J6Q	f	30	t	P-1NH33553PS9092637NG32J6Q
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."User" (id, email, name, password_hash, created_date, updated_date, role, is_email_verified) FROM stdin;
61b2b287-4862-44d2-a6d8-eab9e3e34ba3	stevenjohnsontx90@gmail.com	Steven J	oauth_user	2026-03-17 19:05:27.610846	2026-03-17 19:05:27.610846	popupapp	t
660faf5a-1e96-4652-bea3-ad56ef6d4305	danishcreates786@gmail.com	Danish Creates	oauth_user	2026-03-13 16:16:39.536998	2026-03-13 16:16:39.536998	popupapp	t
f613c96e-3a47-4c22-8afd-57e9175d6c5c	saicharan.629@gmail.com	Sai Charan	oauth_user	2026-03-13 22:11:15.011848	2026-03-13 22:11:15.011848	popupapp	t
aa5f00ed-f7c9-437b-a2b5-cdcbdfe34636	Nashville52002@yahoo.com	Nashville52002	$2b$12$0KNSx7/rGnMsJbmYJBqw9.3.huv7QX0YDjVp5wQ6uYqN.8HKPEB4m	2026-03-12 19:43:22.2021	2026-03-12 19:43:22.2021	popupapp	t
9532467c-246e-4b52-b537-4e5f727ea95d	contact@popupplay.fun	contact	$2b$12$dwElyE0/VF2MAdzseaoWoOwV/6Ynh8u03pouDELG/kGN4A86drr0C	2026-03-12 21:15:28.808349	2026-03-12 21:15:28.808349	admin	t
53f6e12f-31bd-4df5-9cc5-b1aee805f192	kqofhearts420@gmail.com	kqofhearts420	$2b$12$My8a5dBYxnkCAYo5KO6GZu.Y487FmQNSPk2hAxDXuodIfap0CZJlC	2026-03-17 21:27:10.444975	2026-03-17 21:27:10.444975	popupapp	t
246a215a-476b-4f41-b050-b2cf0ddc16ea	jnightmare15@gmail.com	jnightmare15	$2b$12$g29gDeltgpBaZu4ZBA/L1OQGe.lm5aiwJm470PoswcI.cOfPqWw9i	2026-03-17 22:18:54.675065	2026-03-17 22:18:54.675065	popupapp	t
06c69ad6-0083-4109-8b98-4f580db2f6f9	oquelizelaya@gmail.com	oquelizelaya	WmVsYXlhMjAwMkA=	2026-03-13 21:49:44.587429	2026-03-13 21:49:44.587429	popupapp	t
fa4f072c-7ed3-40be-bb7a-29dbc7f56629	msanches010@outlook.com	msanches010	Z296dHVoLTFodWZydS1idXB2aUs=	2026-03-14 05:27:03.641815	2026-03-14 05:27:03.641815	popupapp	t
8217c850-cf45-4066-b3cd-f44c331d11fd	Blackpagevideo1@gmail.com	Blackpagevideo1	$2b$12$/.CY9yEF/dzkqNcg7Ytt7.HbT8tsxX5tSrKoxCyBM6UmOc/8478om	2026-03-14 04:13:46.223777	2026-03-14 04:13:46.223777	popupapp	t
3b8fd776-6a7b-4bd2-95b4-ef64270367ba	danishrehman78677@gmail.com	danishrehman78677	$2b$12$IgfJiXzTOl9fkWboktvk5e86ukY8hwk6us90nyooYSWM6XoTKEZzG	2026-03-12 19:34:47.19054	2026-03-12 19:34:47.19054	popupapp	t
2273a153-aede-4e43-b067-6f2be291c2dc	danishwithfiverr326@gmail.com	Danish Rehman	oauth_user	2026-03-14 07:15:45.355365	2026-03-14 07:15:45.355365	popupapp	t
43323860-ec72-44b5-9db4-e84a05d35b4b	domsammie02@gmail.com	DOMSAMMIE	oauth_user	2026-03-14 09:05:24.448055	2026-03-14 09:05:24.448055	popupapp	t
aca32c3c-052d-4772-b1d7-f05906626385	blackpagevideo1@gmail.com	blackpagevideo1	$2b$12$zXayQfYZRHcvUCIdLt0h1eS6zUf2F4C.ZdLBETkU.MIG2ukkb5foa	2026-03-12 19:41:15.389959	2026-03-12 19:41:15.389959	popupapp	t
d0f8e832-8b4d-42e5-9476-1f6ff00ddd14	blinkz4all@gmail.com	blinkz4all	$2b$12$Dl22UZhMM4gI.VQiNYrgyevGKqbXNEEYznUTqSArE3M/WGD3bfhS.	2026-03-14 10:00:55.145212	2026-03-14 10:00:55.145212	popupapp	t
ca2fe527-19c7-4773-aa89-afb25e48a71e	little0hollow@gmail.com	little0hollow	$2b$12$cfkyjBT9WZitbyODGT8znu7cFuOi0FsuJWH62TZG2eewm7Qduczli	2026-03-15 00:49:29.148052	2026-03-15 00:49:29.148052	popupapp	t
14edd80b-afa9-47fb-b278-97defcb36333	jonesz521@yahoo.com	jonesz521	$2b$12$48Su6XQuwmURExjhy7iEk.zr5FkfgP.zKLOTMayHG/NVtZWfa3ClO	2026-03-15 20:45:34.286361	2026-03-15 20:45:34.286361	popupapp	t
9b8a006c-7ab3-4014-813f-2d42293151f3	mnrealestate11@yahoo.com	mnrealestate11	$2b$12$xZ1NY/2FxYDq0M/.B080yuhtAM9/ItoUovMJ5.0Y5g6KlIHs18sui	2026-03-16 01:42:57.258648	2026-03-16 01:42:57.258648	popupapp	t
a52f6380-93b4-40c1-b392-727c61b9d92d	ansibhai16@gmail.com	Ansi Bhai	oauth_user	2026-03-16 14:18:14.638492	2026-03-16 14:18:14.638492	popupapp	t
386f575a-c326-4775-914d-a94d41ff3b69	fridman2014@gmail.com	fridman2014	$2b$12$IO20JT4P8UMm765Wpu2wiOGN9cqwLBWauHgotdot0LVN7pYdXjFjO	2026-03-16 18:06:08.156042	2026-03-16 18:06:08.156042	popupapp	t
4cede7e5-f8d6-4e32-9e60-afc93784120c	yourstrulykg469@gmail.com	yourstrulykg469	$2b$12$kuzM2HGr3vHXxQo/ZbCneuiW3n9mdmV7x6CAeeDDgvbbG7wAFYPsK	2026-03-16 22:25:49.847595	2026-03-16 22:25:49.847595	popupapp	t
06633f39-1168-44c9-8713-37d1356837c7	cfpeters17@gmail.com	Chris Peters	oauth_user	2026-03-17 10:38:16.825017	2026-03-17 10:38:16.825017	popupapp	t
7ed48375-a809-45fd-bc4a-160aa4ca52a1	Im1badman7@yahoo.com	Im1badman7	$2b$12$u4s.3U4MCUIeNG7hdg8RCuAz631KWaefJsfvtlWIDJgm8Bwxmsbw6	2026-03-18 03:02:03.658484	2026-03-18 03:02:03.658484	popupapp	t
adde86d1-8ad5-4179-bd70-cb492c480779	donalddump77@gmail.com	donalddump77	$2b$12$Fqxd99nTEo8SgYy7IHzaYeY13cui9LpEiv7l04zUORL2r5IaAfYKO	2026-03-18 04:59:45.429125	2026-03-18 04:59:45.429125	popupapp	t
a531b5af-296f-4828-ab88-187ca1264f70	bbcn314@yahoo.com	bbcn314	$2b$12$/zWw1DE//6aEYr8x/ho7Ie35xjmwJrDvQziC10HsRbGHZKMoQgsuK	2026-03-18 18:05:00.994958	2026-03-18 18:05:00.994958	popupapp	t
b28fc713-dee2-492c-877d-035def133d1c	bigboo87_05@yahoo.com	bigboo87_05	$2b$12$jVsm2Sapq4j8VBPPDxyxt.5ehG8Db0NTPr2KJR358elLpRa7UK/Ky	2026-03-18 19:53:21.139261	2026-03-18 19:53:21.139261	popupapp	t
09ce89d2-649d-4081-9457-a6954d284868	thebookcrowns@gmail.com	Book Crowns	oauth_user	2026-03-19 00:03:56.518739	2026-03-19 00:03:56.518739	popupapp	t
85ec0198-3413-4675-9d78-f60217b9a982	ttimmyturnerr62@gmail.com	Timmy turner	oauth_user	2026-03-20 13:22:53.24535	2026-03-20 13:22:53.24535	popupapp	t
5643ac35-8794-4245-94c1-46bfe0b8eb0e	bacon5693@gmail.com	bacon5693	$2b$12$FRypz67iUbvdjojap4etH.PLwg4E6D7H88R91f.MBCsp8r7/S4gGS	2026-03-20 14:23:55.937755	2026-03-20 14:23:55.937755	popupapp	t
9afb5942-89d6-4862-ac74-b59789b8eca9	kmusgrove82@aol.com	kmusgrove82	$2b$12$YTylONCylpyyguErK84fsu/whZXcUoSnVnl2Uveiku.2lAvEc8RBy	2026-03-21 01:23:58.912296	2026-03-21 01:23:58.912296	popupapp	t
65bfd414-96f9-4cd9-b2c3-219774321eec	jodiejoe214@gmail.com	jodiejoe214	$2b$12$Y6eWRyEXfcOh6yN4mL1xC.fwoOeGcth4bSvRLMdiTBOuO9U49V3au	2026-03-21 02:04:38.384452	2026-03-21 02:04:38.384452	popupapp	t
b3596e67-ac6b-42f8-99ba-2fd8946c6a99	angelofromgr@gmail.com	Angelos fromgr	oauth_user	2026-03-21 02:37:47.919322	2026-03-21 02:37:47.919322	popupapp	t
9ae1fb51-db1b-40b9-8c4b-c3fd3896b6ba	jannylovesyou2@gmail.com	jane davis	oauth_user	2026-03-22 13:26:04.520042	2026-03-22 13:26:04.520042	popupapp	t
c5abc096-11c5-4d00-9cda-15ba3b526898	bighomiie5150@gmail.com	bighomie jones	oauth_user	2026-03-21 04:20:40.022723	2026-03-21 04:20:40.022723	popupapp	t
e4878547-51d3-4eb4-b7da-eeb37de13d6d	bevo2169@gmail.com	Roy Pettigrew	oauth_user	2026-03-21 11:13:15.925054	2026-03-21 11:13:15.925054	popupapp	t
d5e71ca3-55c7-4ebd-b946-eeb0afd2254c	Funtogether2001@gmail.com	Funtogether2001	$2b$12$skkHd3Gh5/opE2dkSDvxBOhtvfeVtcegpCD0UQLdC6okjNRhQfe9y	2026-03-21 15:18:54.550842	2026-03-21 15:18:54.550842	popupapp	t
fd8fbe1b-a9d0-47d3-8e9b-559724bbff3f	sissyslutlily@yahoo.com	sissyslutlily	$2b$12$hwEJKk540WD9hMMkiGVRe.w0v3V9NY4tJf6HMpJ9m9QB8yQCIK/8G	2026-03-21 15:23:51.55953	2026-03-21 15:23:51.55953	popupapp	f
7e49ef8e-0e3a-4259-917d-3e100d0d46eb	travoisp@gmail.com	travoisp	$2b$12$lw3nYM0tHnNCh27IMxUbAeZbKJ.huaQ6cqxIvj0e2IFQgxJ3XFAPi	2026-03-21 18:22:39.827695	2026-03-21 18:22:39.827695	popupapp	t
6a92ee8c-354c-4ca0-9c69-27e168d42da3	randall@randallaustin.com	randall	$2b$12$irBT0E6pX1CbqKOHGmq40.pzYwSqY1c6OZcU0AFlngOD0jGrc2SO.	2026-03-21 19:22:07.434003	2026-03-21 19:22:07.434003	popupapp	t
e05f0c8a-07b5-48ba-96ce-a5defb987300	jjroman1974@gmail.com	jj roman	oauth_user	2026-03-21 20:26:33.302091	2026-03-21 20:26:33.302091	popupapp	t
ff85e9b2-67e8-4a11-afe8-6c92b4a15d3e	mdg476121@hotmail.com	mdg476121	$2b$12$SeskvX19fKAecnLviGFOSuoXJmgKDeaABKULkPOe9Fy33P3N1F/la	2026-03-21 21:53:59.009931	2026-03-21 21:53:59.009931	popupapp	t
78c5aa86-035e-4e06-baeb-f51ed339a06f	gonzo1795@yahoo.com	gonzo1795	$2b$12$JzMKL1yxy32DhdF9/rgA0uXBuavD7yi7enzYA/qQE2gJzfrjF28dW	2026-03-21 22:09:30.837294	2026-03-21 22:09:30.837294	popupapp	t
3ba891f4-3439-49a8-8696-4a8ca6145453	pbaudot@umich.edu	Pierre-Olivier Baudot	oauth_user	2026-03-21 22:59:54.43657	2026-03-21 22:59:54.43657	popupapp	t
b11f106f-2d29-4db0-aa91-a042df7fdd1b	ccaprirolo@gmail.com	Carlos Caprirolo	oauth_user	2026-03-21 23:48:17.761108	2026-03-21 23:48:17.761108	popupapp	t
dd81f645-5ab0-4d31-a41e-9b30f7ff004a	youknowkevin9@gmail.com	youknowkevin9	$2b$12$FOuJnqqh7WuvSnxHTw0bVu6VZdB0hZQVSwkjyeB97YL3LOOweOkq2	2026-03-21 03:58:59.666446	2026-03-21 03:58:59.666446	popupapp	t
5a3fbbaa-52b6-4eeb-93e1-cec662ea4666	niitepaine05@gmail.com	niitepaine05	$2b$12$hdMdD7ZVgiyaeO/GHmL1YeWOtT1gVUn0AFY3e19GRDovnIAYYhIDu	2026-03-22 18:06:40.254079	2026-03-22 18:06:40.254079	popupapp	t
c7c125ed-1b74-4206-8a6f-ccab68207a94	xrplifer202425@gmail.com	James Smith	oauth_user	2026-03-23 00:07:24.840541	2026-03-23 00:07:24.840541	popupapp	t
683a5213-21bc-4a40-9840-5c6284aea187	wildrosentx@gmail.com	wildrosentx	$2b$12$l8I4SnD6WVFaABwWRvqb5.kPqjQR2R2xvd3/BPaEMmLVVEy3LJ7jO	2026-03-23 02:29:12.695123	2026-03-23 02:29:12.695123	popupapp	t
5ed54c61-b88f-494b-95d6-af9c74e287ae	aragondragneel@gmail.com	A	oauth_user	2026-03-23 11:17:02.495207	2026-03-23 11:17:02.495207	popupapp	t
afe98a2d-f97e-4493-8355-db6434e63154	bear79072@gmail.com	bear79072	$2b$12$OqDDZSub9hIf97h51ocG9ejDNmQBcMhO8JlkNVfdiN4t8hltPam8m	2026-03-23 19:06:39.815364	2026-03-23 19:06:39.815364	popupapp	t
c03d1555-4d98-447f-b5ed-33110901614a	markreverly@gmail.com	Mark Everly	oauth_user	2026-03-23 20:42:35.374564	2026-03-23 20:42:35.374564	popupapp	t
54c944eb-cf09-480c-8a58-a28d730eb895	papasmurff254@gmail.com	Reginal Marshall	oauth_user	2026-03-23 21:42:20.775783	2026-03-23 21:42:20.775783	popupapp	t
f012210a-dee6-4ebe-b5c9-2aa901755a99	susking1994@gmail.com	susking1994	$2b$12$b01W5DZeFEAMcAwQTKas9.gL7s4QVAnS4/OsC5fPoe8D1xVex.xK6	2026-03-24 19:43:12.122376	2026-03-24 19:43:12.122376	popupapp	t
f63214d6-e0f2-42c2-a9b5-410e370f5c26	lost48928@gmail.com	Lost	oauth_user	2026-03-24 20:43:25.943022	2026-03-24 20:43:25.943022	popupapp	t
\.


--
-- Data for Name: UserProfile; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."UserProfile" (id, user_email, display_name, name, bio, avatar_url, age, gender, interested_in, interests, hobbies, looking_for, city, state, zip_code, country, is_popped_up, has_ever_popped_up, popup_message, photos, videos, location, latitude, longitude, last_location_update, created_date, updated_date, email_notifications_enabled) FROM stdin;
0635a8d0-c0ac-41e1-95bf-1fc45ebcfb62	danishrehman78677@gmail.com	danishrehman78677	\N	Here is the bio.	https://popupplay.fun/api/uploads/1773418398685_e4d1ab04568633557f7607dcb709ddb0.jpeg	22	male	women	{interest}	hobby	looking for someone.	Dubuque	\N	52001	\N	t	t	hi	{}	{}	Kamoke	31.98445140	74.23571390	2026-03-20 05:58:24.803	2026-03-12 20:16:51.387358	2026-03-20 05:55:34.532613	t
8839b80a-84a5-43f0-8a49-bc0d92b21b73	jonesz521@yahoo.com	BBC_4_U	\N	Just looking for fun 	https://www.popupplay.fun/api/uploads/1773608008940_821e68a1269ed5737c41e70f221166dc.jpg	35	male	everyone	{}	Playing 	Fwb,couples and ladies 	Fort Worth	TX	76147	United States	t	t	Just joined! Looking to connect.	{https://www.popupplay.fun/api/uploads/1773608079994_907880d07b923d2964fd5843280d816c.jpg}	{}	Watauga	32.86396530	-97.26083700	2026-03-23 02:45:27.023	2026-03-15 20:54:45.344883	2026-03-23 02:45:27.085561	t
903706ce-e27a-44bc-8621-fe9605062cee	danishwithfiverr326@gmail.com	Danish Rehman	\N	This is the bio	https://popupplay.fun/api/uploads/1773472680059_0534f5446086d85cbfd4c616372f4b96.jpeg	22	male	women	{}			Los Angeles	\N	90001	\N	t	t	Just joined! Looking to connect.	{}	{}	Kamoke	31.98469450	74.23621730	2026-03-20 13:49:48.479	2026-03-14 07:15:45.35777	2026-03-20 13:46:58.25492	t
f6885796-bbd4-46ed-bdd4-69515c49b940	blackpagevideo1@gmail.com	Bbc for Wives	\N	We set up parties for milfs	https://popupplay.fun/api/uploads/1773440001322_318e974fc27d9c88d47594bb18fee2cf.jpeg	38	male	women	{"Bbc parties",Bbc,Milfs,Hotwives}		Swingers into bbc	Fort Worth		76112		t	t	Where the freaks?	{https://popupplay.fun/api/uploads/1773352604343_e3de087e0d9d586fc40ef8fdefca0c04.jpeg,https://popupplay.fun/api/uploads/1773352613606_d9e610a364d954b88109751204041e77.jpeg,https://popupplay.fun/api/uploads/1773352613608_0b5d12a68b466dbb833012ba6c961564.jpeg}	{https://popupplay.fun/api/uploads/1773358027006_7d4d50bb4d0f354b7c5e7259a59f6356.mov}	Coppell	32.94653879	-97.01079973	2026-03-21 20:55:32.624	2026-03-12 19:41:16.299447	2026-03-21 20:55:32.76177	t
3d296797-de2e-4498-9765-161ccabde522	youknowkevin9@gmail.com	Me Myself & I	\N	Looking to meet real, genuine, non-flaky ladies and couples who enjoy a BBC. I’m straight. Tel @kagspeak	https://popupplay.fun/api/uploads/1774143225169_9d541b8d4004f8ac257d45b29eb97b78.jpeg	67	male	women	{"Laughter Good Vibes and Chemistry","Erotica, BDSM",Voyeurism,Exhibitionist}	OPEN hmm... :)	Only interested in real, open-minded, and dependable connections—no flakes.	Plano	TX	75025	United States	t	t	Just joined! Looking to connect.	{}	{}	Plano	33.09733726	-96.74628580	2026-03-23 00:25:35.291	2026-03-21 04:04:06.401527	2026-03-23 00:25:36.1314	t
a63bb54c-323a-43fc-984a-a314a69c8f82	Nashville52002@yahoo.com	Nashville52002	\N	Love bbc	https://popupplay.fun/api/uploads/1773364457730_b278dbbf12b88bfb06b78dbdf3bd8367.jpeg	45	female	men	{Bbc,Cuckold}		Bbc for the wife.	Antioch	\N	37011	\N	f	t		{https://popupplay.fun/api/uploads/1773364428769_11c042fa7279afab4c29303a4919552e.jpeg}	{https://popupplay.fun/api/uploads/1773364447819_d1bccc5b8ce2687ec146027e862bcf5c.mov}	Fort Worth	32.73765913	-97.20831100	2026-03-17 22:40:34.061	2026-03-12 19:43:23.457656	2026-03-17 22:40:34.23836	t
1122b735-ffc3-4ef3-9b71-879660476c02	danishcreates786@gmail.com	Danish Creates	\N	This is the id of danish creates.	https://popupplay.fun/api/uploads/1773418836251_3128b5d82fdfae770118472b9e42351f.jpg	22	male	women	{daniint}	tourism	looking for someone.	Dubuque	\N	52003	\N	t	t	Just joined! Looking to connect.	{}	{}	Lahore	31.55230720	74.29488640	2026-03-17 10:27:53.165	2026-03-13 16:16:39.53879	2026-03-17 10:27:53.302627	t
6a2a40c4-eb3e-4f20-b406-eb1fc28f465c	thebookcrowns@gmail.com	Book Crowns	\N	Dbndn	https://lh3.googleusercontent.com/a/ACg8ocIyKD0M4OTYfKKSL2dQSSLoZj4Y1PxbOpnCIT8S2wNCnlbZLYg=s96-c	69	male	women	{}			Katy	TX	77494	United States	t	t	Just joined! Looking to connect.	{}	{}	Bhakkar	31.61122960	71.07429410	2026-03-20 20:44:19.9	2026-03-19 00:03:56.52009	2026-03-20 20:44:21.071384	t
744ab123-529f-48f8-90c4-c5a204d8e6aa	bevo2169@gmail.com	Roy Pettigrew	\N		https://lh3.googleusercontent.com/a/ACg8ocLhVjeJ8TH4IasFT0wL7GiD_obes84ng-7JoHt21903NuJ_Lw=s96-c	50	male	women	{}	love hotwifes	Females and cpls			75070		t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1774091698674_1eef637d57cf8c375fc8d812b967b61f.jpeg}	{}	Van Alstyne	33.40911026	-96.56893919	2026-03-23 05:07:37.657	2026-03-21 11:13:15.927451	2026-03-23 05:07:37.999935	t
61833d54-d1c3-4645-ba0f-fbb495f45267	bighomiie5150@gmail.com	Bighomiejones	\N		https://lh3.googleusercontent.com/a/ACg8ocIxgP86DusivxRjW6XxzeqZtbzrdtQLaXEiTskoHqasTEGP-Q=s96-c	28	male	women	{}					76112		t	t	Just joined! Looking to connect.	{}	{}	Fort Worth	32.74759041	-97.21665508	2026-03-24 22:58:14.023	2026-03-21 04:20:40.024719	2026-03-24 22:58:14.072573	t
aad5cd64-3716-4b74-834f-c4655ae3e177	stevenjohnsontx90@gmail.com	Steven J	\N	Enjoying life 😉 	https://lh3.googleusercontent.com/a/ACg8ocIgphl0S-hVhLCWAnEY21E8-DndNqmWglKeLIbShtKolUJ9Rkw=s96-c	35	male	women	{"Working out"}			Sugar Land	TX	77479	United States	t	t	Just joined! Looking to connect.	{}	{}	Irving	32.94012417	-96.96097105	2026-03-21 03:00:37.568	2026-03-17 19:05:27.612456	2026-03-21 03:00:37.641147	t
719ebe17-b131-4e7f-be18-546dee615e52	jodiejoe214@gmail.com	jodiejoe214	\N	Fun cool vibes BBC here	https://popupplay.fun/api/uploads/1774064890568_2ad153ff2f45558ddbc1cdde20703d90.jpeg	35	male	women	{Hotwife,Gangbang,Breeding}	Watch anime 	A NSA but cool vibes	Seagoville	TX	75159	United States	t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1774064809400_85d040d08b0d499c7bbf5b0fd5b64f6d.jpeg}	{}	Seagoville	32.66209543	-96.55736057	2026-03-21 19:32:48.903	2026-03-21 03:48:12.303684	2026-03-21 19:32:48.935388	t
c8f36a39-5e99-44ce-9acb-26d1260b6cfb	donalddump77@gmail.com	Bbcthug	\N	Bbc	https://popupplay.fun/api/uploads/1773810329061_e4bc293dd2fc8b525314dfe962b8ac2d.jpg	28	male	women	{Bbc}	Bruh	Connections 	Minneapolis	MN	55404	United States	t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1773810277105_389b842f9cd68601c015412f67637277.jpg}	{}	Minneapolis	44.93440481	-93.21429886	2026-03-24 07:27:46.412	2026-03-18 05:05:31.303313	2026-03-24 07:27:46.461403	t
803b692a-3b86-4c13-a673-5cef6e7060fa	oquelizelaya@gmail.com	oquelizelaya	\N	\N	\N	\N	\N	\N	{}	\N	\N	Euless	Texas	75261	United States	t	t	Just joined! Looking to connect.	{}	{}	Haltom City	32.80401400	-97.26088150	2026-03-13 21:49:54.145	2026-03-13 21:49:54.127716	2026-03-13 22:40:08.989619	t
d80b3408-cd73-45e9-b682-1451f9c17849	msanches010@outlook.com	msanches010	\N		\N	\N			{}	\N		Schipluiden	South Holland	2636kb	Netherlands	t	t	Just joined! Looking to connect.	{}	{}	Rotterdam	51.93726459	4.49382301	2026-03-14 05:27:36.612	2026-03-14 05:27:07.618999	2026-03-15 02:07:26.205581	t
5e502b32-88c2-4df4-9bea-d5afaeb9a451	ansibhai16@gmail.com	Ansi Bhai	\N		https://lh3.googleusercontent.com/a/ACg8ocL3_W3zvhjnk9wwSchZsLv6ZkDj3PWEIv7x4jdlPIGsM42XqA=s96-c	18	male	women	{"hot girls",baddies}	badminton, book reading, insta scrolling				05450		t	t	Just joined! Looking to connect.	{}	{}	Faisalabad City Tehsil	31.37090000	73.03360000	2026-03-16 17:59:50.848	2026-03-16 14:18:14.640616	2026-03-16 18:00:01.101405	t
cd31454a-60b3-4092-ba53-897d95bc13dc	blinkz4all@gmail.com	Monayy😇👅	\N	Thickie 🥰😜	https://www.popupplay.fun/api/uploads/1773482623368_a4ac7f1f7d5531da3b97e198e7e7a729.jpeg	33	female	men	{}	Video games and dancing 	Fun 	Los Angeles	\N	90001	\N	t	t	Just joined! Looking to connect.	{https://www.popupplay.fun/api/uploads/1773482724303_b5fa00d13ed33783f59010cc32d28ab9.jpeg,https://www.popupplay.fun/api/uploads/1773482724304_002e357f7ce7c19b54ac15ef37f1074c.jpeg,https://www.popupplay.fun/api/uploads/1773482724313_5c80bdc4f9b02cee6dc2b2cf09a8f3aa.jpeg,https://www.popupplay.fun/api/uploads/1773482725135_d5e9a8e0e18ecac508095782a864fbd7.jpeg,https://www.popupplay.fun/api/uploads/1773482725134_44b3972af758ca90de0a0d9e008f459a.jpeg}	{}	Kabba	7.82169110	6.06742470	2026-03-14 10:07:56.219	2026-03-14 10:06:29.961024	2026-03-14 10:07:56.358039	t
922f3643-f946-4a11-b8a5-527c599a2e5f	Blackpagevideo1@gmail.com	Blackpagevideo1	\N	This is the bio	https://popupplay.fun/api/uploads/1773462308565_ae2a1df042f00e96822e5f7dbc5a48fd.jpeg	25	male	women	{interest}			Dubuque	IA	52001	United States	t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1773463306025_7b9f588d6078f98a1078fbaf89192cf3.jpeg}	{}	Lahore	31.55230720	74.29160960	2026-03-14 07:08:32.228	2026-03-14 04:13:47.679898	2026-03-14 07:08:32.37211	t
0fd5f1cf-a54d-4813-b3a5-969028f512a6	saicharan.629@gmail.com	Sai Charan	\N		https://lh3.googleusercontent.com/a/ACg8ocL9_gKoFrnf5QVdTioYDBG074qrxkTmJctYFE7NqGo4oQu6OiQ=s96-c	35	male	women	{}			Melissa	\N	75454	\N	t	t	Just joined! Looking to connect.	{}	{}	Location Found	33.18978761	-96.77677921	2026-03-22 21:09:02.508	2026-03-13 22:11:15.013605	2026-03-22 21:09:02.525171	t
c43f0696-24ff-4f6f-993f-fbfca3587c93	domsammie02@gmail.com	DOMSAMMIES	\N		https://popupplay.fun/api/uploads/1773479253303_90f3842d750a9653e029497b7920a7d4.jpeg	45	female	everyone	{Bbc,Dominatrix}		Bdsm and more	Irving		75062		t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1773479231812_6945fe3f925bfc8c07ca1fafd55b9ee1.jpeg}	{}	Fort Worth	32.73750480	-97.20873003	2026-03-14 09:09:39.891	2026-03-14 09:05:24.449518	2026-03-15 01:19:50.552242	t
9924e1af-d4f4-4801-b382-6b83dcd4c036	little0hollow@gmail.com	Blain47 	\N	Looking to have some fun. Can't message here, you can message me @blain on telegram.	https://popupplay.fun/api/uploads/1773536647744_50f4c7d1fda4e0a6d50b41d6ccec1280.jpg	36	male	women	{Sex}			Duncanville		75116		t	t	Just joined! Looking to connect.	{}	{}	Duncanville	32.66326400	-96.92126150	2026-03-16 13:27:01.189	2026-03-15 01:04:59.172532	2026-03-16 13:27:01.514131	t
ebd4082d-e44b-46c2-ba08-09b51f9aac41	fridman2014@gmail.com	fridman2014	\N		https://popupplay.fun/api/uploads/1773684471044_27747a96300ffdfaa83df192fe09c765.jpeg	29	male	women	{}			Camp Lejeune	NC	28547	United States	t	t	Just joined! Looking to connect.	{}	{}	Havelock	34.91202826	-76.90303166	2026-03-20 16:05:06.016	2026-03-16 18:07:52.5611	2026-03-20 16:05:06.07193	t
323767c1-b610-4818-87be-4d10dc8da16a	ttimmyturnerr62@gmail.com	Timmy turner	\N	\N	https://lh3.googleusercontent.com/a/ACg8ocLrhRDBUHdga8OI5d1m2xVGAkyLiVuPxUb9gm7FVV9jed8uCA=s96-c	\N	\N	\N	{}	\N	\N	\N	\N	\N	\N	f	f	\N	{}	{}	\N	\N	\N	\N	2026-03-20 13:22:53.247651	2026-03-20 13:22:53.247651	t
5256b5bb-721d-4a63-9f3b-aa08f6b04a51	jnightmare15@gmail.com	jnightmare15	\N	Chilled laid back guy very kinky of course. Work monday thru friday. Anything else just ask im a open book	https://popupplay.fun/api/uploads/1773786230103_8fa0c5c7f4e7a3fb8d2da2794fca35b7.jpg	33	male	women	{}	A lot really sports video games anything indoors or outdoors		Joaquin	TX	75954	United States	t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1773786179732_55eb3627a364802380f9a38116fb8973.jpg,https://popupplay.fun/api/uploads/1773786245364_7c9a0195e1f6a0df02e3176870871fa3.jpg}	{}	Joaquin	31.97197110	-94.03983280	2026-03-17 22:25:45.645	2026-03-17 22:24:11.118173	2026-03-17 22:25:46.678669	t
762e4c7c-6d2a-4989-911d-ddbfb16c50bb	Im1badman7@yahoo.com	Im1badman	\N	Dom bbc experienced in many ls dynamics	https://popupplay.fun/api/uploads/1773803201216_8d3a6c7232f4ead8de1bef8bb2c7883b.jpg	39	male	women	{Sex,Parties,Gb}	Dance and watch movies	Here to have fun.			75034		t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1773803135977_b9fe85f921f86c6fdb14ebbbe7187931.jpg}	{}	Location Found	33.15412050	-96.84325160	2026-03-18 03:14:14.037	2026-03-18 03:06:46.533427	2026-03-18 03:14:14.645449	t
0032bb6f-933e-4f25-a800-c036e9f1b227	mnrealestate11@yahoo.com	MNsexy2	\N	Late 30’s couple who keep in shape, love the outdoors and spontaneous fun!  Solo play occasionally 	https://popupplay.fun/api/uploads/1773625871497_b7c147df6121624d5597c7006605e03a.jpeg	39	male	everyone	{MFM,MFF,MFMF,Swinger,Solo}	Anything outdoors!  Boating, fishing, hunting, riding, aviation. 	Very open 			55379		t	t	Minnesota 	{https://popupplay.fun/api/uploads/1773625692806_096de7fd66b09bcf8d1de10a394332a2.jpeg}	{}	Faxon Township	44.64365683	-93.78612663	2026-03-18 10:43:42.47	2026-03-16 01:51:18.007359	2026-03-18 10:43:42.735006	t
86a8ad0f-2b88-4e6e-82f0-5c9183829a34	bbcn314@yahoo.com	ALLSTAR_BBC	\N		https://popupplay.fun/api/uploads/1773857790198_ddf4aecc3f04fa8811fd6f4ca2982f8a.jpg	42	male	women	{}		Looking for a good time	Arlington	TX	76010	United States	f	f	\N	{}	{}		\N	\N	\N	2026-03-18 18:17:09.546676	2026-03-18 18:22:07.990214	t
60989154-5143-4a2c-83ec-b43c1f5691d0	bigboo87_05@yahoo.com	Cato05	\N	Black male looking for fun	https://popupplay.fun/api/uploads/1773864097319_71eec60830a9b0533662bed1faf7c0d0.jpeg	39	male	women	{}	Playing basketball 	Looking for women that’s trying to have a good time 	Ferris	TX	75125	United States	f	f	\N	{https://popupplay.fun/api/uploads/1773863921490_dcb62f9eb068c41c430f8038d0a25c0c.jpeg}	{}		\N	\N	\N	2026-03-18 20:01:39.519895	2026-03-18 20:01:39.519895	t
385dc5e6-a031-4500-b883-7bbe029e73d2	niitepaine05@gmail.com	niitepaine05	\N		https://www.popupplay.fun/api/uploads/1774202875653_d75bb69c07b18c59d47be167ab954d0d.jpg	32	male	women	{}	Sports	Fun 	Garland	TX	75040	United States	t	t	Just joined! Looking to connect.	{}	{}	Garland	32.95538040	-96.61281900	2026-03-22 18:08:59.043	2026-03-22 18:08:04.913479	2026-03-22 18:08:59.226968	t
fc9b9056-73c6-4fde-8e26-c09b21f710fb	bacon5693@gmail.com	Motionless Ocean	\N		https://popupplay.fun/api/uploads/1774123620339_d9b50899880292ca7ce376603148be58.jpg	28	male	women	{}			Marshall	TX	75672	United States	t	t	Just joined! Looking to connect.	{}	{}	Palestine	31.72900930	-95.68569620	2026-03-22 05:14:31.983	2026-03-21 20:07:04.916907	2026-03-22 05:14:33.46568	t
d1f40e8d-d35b-4645-ab1e-76a0898773bc	randall@randallaustin.com	Randollaa	\N	Dallas Native.  Nudist Influencer. \nHung fun wingman / discrete / open \n#bwc for locals swingers / nudists and the curious	https://popupplay.fun/api/uploads/1774121331026_24c0d6596bbc50a25d17e8d4bdfdd039.jpg	63	male	everyone	{Swinging,"local socials",nudism,"group play","house parties","Bar mixers"}	photography, nude 5K series (your invited) and various discrete activities. \nmfm / mfm - 3some / more some. 	Sincere / legit and honest fun loving exhibitionist and active swingers in Dallas. 	Dallas	TX	75219	United States	f	f	\N	{https://popupplay.fun/api/uploads/1774121237054_0a1538345bd34dfc9b55d9aa5265d6a4.jpg,https://popupplay.fun/api/uploads/1774121268279_b8f06d49a94cc3f6be66368f95fd0efe.jpg}	{}		\N	\N	\N	2026-03-21 19:28:57.52454	2026-03-21 19:28:57.52454	t
7913e978-439c-45e2-bbb1-c5ddbd81acda	jjroman1974@gmail.com	jj roman	\N	\N	https://lh3.googleusercontent.com/a/ACg8ocJiqSX5A0zm_Hlt1kWWBJppdzH_3aDxAhm68vyAtF6z3o6aSw6_=s96-c	\N	\N	\N	{}	\N	\N	\N	\N	\N	\N	f	f	\N	{}	{}	\N	\N	\N	\N	2026-03-21 20:26:33.305207	2026-03-21 20:26:33.305207	t
527ea88d-c026-4ae6-a938-b75cb6b3b912	travoisp@gmail.com	tnasty_thebull	\N	Hey I’m T! 29, 6’3, 8.5inch bbc, and I love the lifestyle. I’m very outgoing, easy to talk to and love sharing and hearing about the lifestyle. If you have any questions feel free to reach out! Again I love meeting new people!\n\nI’m always traveling looking for fun, and I also host fun events at my place from time to time.\n\nPlease REACH OUT if you think we could be friends or more!	https://popupplay.fun/api/uploads/1774117624902_ef3a50bc35c235ef3734bc978f103ee5.jpeg	29	male	everyone	{"Filming, photography, bars, live music, sports"}	Golf, film , content \n	Connections! Business wise, friendships, intimate. Doesn’t matter 	Dallas	TX	75208	United States	t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1774117607997_65fbc365047700672563e75e1330b0b5.jpeg}	{}	Dallas	32.74914064	-96.84811455	2026-03-22 03:48:46.752	2026-03-21 18:27:18.161492	2026-03-22 03:48:46.768688	t
45292e3e-e4ac-487f-bbc6-d43d2737b51e	xrplifer202425@gmail.com	James Smith	\N	\N	https://lh3.googleusercontent.com/a/ACg8ocLeW5_X8Xmaj12-CBqhft_8eWyZHWDgR2YOpSQP6pnpU_wJfw=s96-c	\N	\N	\N	{}	\N	\N	\N	\N	\N	\N	f	f	\N	{}	{}	\N	\N	\N	\N	2026-03-23 00:07:24.842068	2026-03-23 00:07:24.842068	t
c21a6c4f-76db-4fe0-a5b9-aaf3f4ef797a	ccaprirolo@gmail.com	HWCpl	\N		https://lh3.googleusercontent.com/a/ACg8ocKWXGENxnnugwDgQfAViBzXZtb5bL5lnla1I0Nx8oFD-saLcg=s96-c	34	female	everyone	{}					75034		t	t	Just joined! Looking to connect.	{}	{}	Frisco	33.11591869	-96.85637370	2026-03-21 23:49:44.6	2026-03-21 23:48:17.764553	2026-03-21 23:49:44.680293	t
76695fff-48f9-4a57-9d08-86226732c16c	mdg476121@hotmail.com	mdg476121	\N	Married Couple	https://popupplay.fun/api/uploads/1774130363960_9b95f70def7aaee91e6d98f07845a402.jpg	50	prefer-not-to-say	women	{Fun}	Cook	Fun	Arlington	Texas	76011-5021	United States	t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1774130266026_fcfdabff29f000f04ded2adcf1e1ba99.jpg,https://popupplay.fun/api/uploads/1774130343606_d4596d3123794b8ec1e9ebc35c80c644.jpg}	{}	Arlington	32.75371107	-97.09403689	2026-03-23 14:30:12.431	2026-03-21 21:59:37.055872	2026-03-23 14:30:12.414678	t
db19a500-c815-45be-abc8-3150b12b5f49	jannylovesyou2@gmail.com	RealDealBull 	\N		https://lh3.googleusercontent.com/a/ACg8ocJru_xCN8Sfgy14jPTguJnF_sdKTxIAZEAejQWxWqrnSmPmJQ=s96-c	33	female	women	{}					75067		t	t	BBC BULL AT QUALITY INN NEXT TO COLETTE, let’s play 	{}	{}	Lewisville	33.01109917	-96.98322029	2026-03-24 00:30:49.938	2026-03-22 13:26:04.522711	2026-03-24 00:30:49.981709	t
fb67e23f-1d98-4254-8235-a21fcd6cac01	contact@popupplay.fun	Admin	contact	We connect swingers.	https://popupplay.fun/api/uploads/1773443660682_71d269f39d5a9255ef0fb761e33cbe95.jpeg	39	male	women	{"Watch Dog"}		Connect Couples	Irving	\N	75062	\N	t	t	Looking for wives for BBC content.	{https://popupplay.fun/api/uploads/1773440324971_35d4d55a88752db863ebc7521f9dd2ae.jpeg}	{}	Fort Worth	32.73766119	-97.20845475	2026-03-24 20:29:43.501	2026-03-12 21:15:28.810575	2026-03-24 20:29:43.534423	t
20525452-77e4-433e-af55-d66cad92d48c	kmusgrove82@aol.com	ExperienceNikki	\N	Fun, free spirited curvy blonde who loves the outdoors & people! 	https://www.popupplay.fun/api/uploads/1774057383585_52616fb49c38676798ae016ac2de0227.jpeg	39	female	men	{}	Anything outdoors & watching crime shows	Fun & like minded people			73102		f	t		{https://www.popupplay.fun/api/uploads/1774057466246_9eb3b55eab941eccd6722fc37233f83d.jpeg}	{}	Location Found	34.48149960	-98.51840050	2026-03-24 06:54:00.969	2026-03-21 01:44:37.47063	2026-03-24 06:54:01.101588	t
af526e3e-ed43-488a-a0c8-20c63328b05b	papasmurff254@gmail.com	Reginal Marshall	\N	Bull	https://lh3.googleusercontent.com/a/ACg8ocIEK9VC3ZXWxv9nnCtk_caHfVSn4nNKSPofEWBdJlmdCQhjjC4q=s96-c	43	male	women	{}					76708		t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1774302279262_b6f7ddb39f0bbbaac6b30d1a8d04b609.jpeg}	{}	Waco	31.56503069	-97.16185456	2026-03-23 21:45:56.247	2026-03-23 21:42:20.777503	2026-03-23 21:45:56.286659	t
4fb5be3d-cb05-4cab-8402-6894b72a8941	wildrosentx@gmail.com	448WesGee	\N	Loading….	https://popupplay.fun/api/uploads/1774234198373_a6ed689eba976007498075076978e896.jpeg	36	male	women	{Mfm,Females,Ffm,Fffm,Gangbang,"Mostly anything"}	I work a lot, but when I do get the time to enjoy myself, I like to travel shop go to sporting events and concerts as well as spend time with my children	Organic with a freaky mama who got a good vibe. Open 	Cleburne	TX	76031 	United States	t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1774234009642_d815a627a1bc74172af74bcb57be8c32.jpeg,https://popupplay.fun/api/uploads/1774234007798_275fdeb959ee821c83f34fadb3e4ae4d.jpeg,https://popupplay.fun/api/uploads/1774234008978_12f7e01f806072248125b317b43f2e2d.jpeg,https://popupplay.fun/api/uploads/1774234009101_769231f16cdcd3e607b7be4d5d8d64e7.jpeg,https://popupplay.fun/api/uploads/1774234008276_078bf905482c8f3d433119cdcdae02ec.jpeg,https://popupplay.fun/api/uploads/1774234009726_e3217b395b1b4674801a8e2101708305.jpeg,https://popupplay.fun/api/uploads/1774234010135_d3e4b4fe1f640ba14a6a43101a036948.jpeg,https://popupplay.fun/api/uploads/1774234010186_38c1b914ec8d732a321b03c0307f6074.jpeg,https://popupplay.fun/api/uploads/1774234005281_d6bff950c55f64125b2ecf5373766ace.jpeg}	{}	Cleburne	32.37332535	-97.38264911	2026-03-23 03:03:18.6	2026-03-23 02:50:01.179988	2026-03-23 03:03:54.706463	t
016c0262-8226-430f-b031-8283c6d691a9	aragondragneel@gmail.com	A	\N	\N	https://lh3.googleusercontent.com/a/ACg8ocI7ExdRD3w_JOmgewIRurQ9pIUuEReXlr9AD4sDsMiDR0OAsA=s96-c	\N	\N	\N	{}	\N	\N	\N	\N	\N	\N	f	f	\N	{}	{}	\N	\N	\N	\N	2026-03-23 11:17:02.498765	2026-03-23 11:17:02.498765	t
dca093a5-6c08-4d8e-8b3e-a483fdd81960	susking1994@gmail.com	susking	\N	.	https://popupplay.fun/api/uploads/1774381556493_f5f7102bc96a47a624d93f1a00b4b22f.jpg	31	male	everyone	{Cuckold,Bbc}	.	.	Duncan	OK	73533	United States	f	f	\N	{}	{}		\N	\N	\N	2026-03-24 19:46:05.385766	2026-03-24 19:46:05.385766	t
882dcfd0-1f17-4e3c-8865-902f5e7c317e	bear79072@gmail.com	bear79072	\N	I'm the husband side of a couple that likes to have fun.	https://popupplay.fun/api/uploads/1774293768354_771b75532951ba40b483656086515b6f.jpg	59	male	women	{BBC}	We go to clubs, house parties, love to provide motorcycles, hang out in our backyard and the swimming pool.	Not sure yet.	Lockney	TX	79241	United States	t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1774293897583_13fc7be894ac0846aac3dd11bde38a02.jpg,https://popupplay.fun/api/uploads/1774293897768_3282bd90f992aef0ec763b7e523bdd6c.jpg,https://popupplay.fun/api/uploads/1774293897879_80902b07622697a590af8a68b71ce944.jpg,https://popupplay.fun/api/uploads/1774293898003_a50e1633bbd178c914045c25a04163b4.jpg}	{}	Location Found	34.17776000	-101.62922830	2026-03-23 19:39:25.489	2026-03-23 19:25:04.377735	2026-03-23 19:39:25.805122	t
4c2083db-9cc1-4b91-a84f-891821dced9a	markreverly@gmail.com	Mark Everly	\N	\N	https://lh3.googleusercontent.com/a/ACg8ocKdEQzn7ahVaWnDZVwpsynQHPWRntSnPFz9mimobAmShVJw6w=s96-c	\N	\N	\N	{}	\N	\N	\N	\N	\N	\N	f	f	\N	{}	{}	\N	\N	\N	\N	2026-03-23 20:42:35.376321	2026-03-23 20:42:35.376321	t
500a0d1b-5f91-4c4b-b9d1-3bd40cee68e4	lost48928@gmail.com	Lost	\N		https://lh3.googleusercontent.com/a/ACg8ocItYy33lbPGMzl-7qKdfR-LSimi8XAFqpfx3Fg5LVsB95HCCA=s96-c	32	male	women	{}			Dallas	TX	75218	United States	t	t	Just joined! Looking to connect.	{}	{}	Location Found	32.77608510	-96.89283930	2026-03-24 20:46:20.81	2026-03-24 20:43:25.944942	2026-03-24 20:46:21.219833	t
\.


--
-- Data for Name: UserSession; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."UserSession" (id, user_email, device_id, last_active, user_agent, created_date, updated_date) FROM stdin;
8f64e3b4-bf9a-4088-a698-8d4e0c3d65db	blinkz4all@gmail.com	device_1773270512843_6gsm38g7e	2026-03-14 18:30:59.391	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/135.0.7049.83 Mobile/15E148 Safari/604.1	2026-03-14 10:01:12.322649	2026-03-14 18:30:59.544414
91fd6e34-0567-4dd2-9661-6804a0e5d371	fridman2014@gmail.com	device_1773684424500_sr1wfn0y9	2026-03-16 22:16:43.347	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-03-16 18:25:26.496439	2026-03-16 22:16:43.395036
859394d0-cb69-4c6c-bd35-9c9d4da42f79	bbcn314@yahoo.com	device_1773857750885_ewmgpm4tt	2026-03-18 21:55:11.415	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36	2026-03-18 21:28:06.68417	2026-03-18 21:55:11.795319
1766cd4c-0ae7-486a-8b2c-3b510050f06d	ansibhai16@gmail.com	device_1773670685641_f7e8ghvzc	2026-03-16 18:03:19.125	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-16 14:18:16.517087	2026-03-16 18:03:29.362026
ba73d770-5988-4fc9-ba4c-6d69250dab7d	jnightmare15@gmail.com	device_1773785966005_5hc64953z	2026-03-17 22:30:06.925	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36	2026-03-17 22:19:27.387445	2026-03-17 22:30:08.099864
8050f97b-f122-41e9-8e48-524efb53ce71	donalddump77@gmail.com	device_1773833728291_h25kbvo9b	2026-03-18 15:11:45.594	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1	2026-03-18 12:15:21.009079	2026-03-18 15:11:45.641575
644ac4ba-db93-4ff1-ac46-7f6d3367ffc9	msanches010@outlook.com	device_1773466024012_2h3p9pjnz	2026-03-14 05:28:04.247	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1	2026-03-14 05:27:04.289812	2026-03-14 05:28:04.316218
a4e96bd9-231a-4b35-88c0-ad0e7a6bdbdb	stevenjohnsontx90@gmail.com	device_1773774328348_0c0ts2rem	2026-03-19 01:54:42.263	Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1	2026-03-17 19:05:28.801275	2026-03-19 01:54:42.317471
389327f1-cbf1-4bc4-bb94-9421896fd120	saicharan.629@gmail.com	device_1773536749238_52mbbm8rf	2026-03-15 01:06:27.365	Mozilla/5.0 (iPhone; CPU iPhone OS 26_3_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/411.0.879111500 Mobile/15E148 Safari/604.1	2026-03-15 01:05:49.394278	2026-03-15 01:06:27.403779
dfa5cded-8e84-43d4-8395-5e03d15c546b	bigboo87_05@yahoo.com	device_1773863806248_vy6lqgwn2	2026-03-20 05:06:51.636	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-03-18 19:56:46.44354	2026-03-20 05:06:51.696576
268ca03c-be18-471f-aa96-d92800575859	danishcreates786@gmail.com	device_1773743107777_7i0prilyd	2026-03-17 10:32:53.191	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-03-17 10:25:08.434802	2026-03-17 10:32:53.332271
771d9952-accd-4b8c-ad0a-6589a13bf0d2	Im1badman7@yahoo.com	device_1773802960175_bnsjrbu8k	2026-03-18 03:59:37.27	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/29.0 Chrome/136.0.0.0 Mobile Safari/537.36	2026-03-18 03:59:07.85241	2026-03-18 03:59:37.842022
\.


--
-- Data for Name: UserSubscription; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."UserSubscription" (id, user_email, status, plan, start_date, end_date, stripe_subscription_id, created_date, updated_date, paypal_order_id, paypal_subscription_id) FROM stdin;
311d5ed8-86da-4159-8ba8-6bc35d972c96	danishcreates786@gmail.com	active	\N	2026-03-13 16:36:24.893	2026-04-11 21:16:46.256	\N	2026-03-13 16:36:24.893983	2026-03-13 16:36:24.893983	\N	\N
fe3710fe-4d9d-449d-8376-1ea9f8ae559e	danishrehman78677@gmail.com	active	\N	2026-03-13 16:40:18.393	2026-04-12 16:40:04.024	\N	2026-03-13 16:40:18.393865	2026-03-13 16:40:18.393865	\N	\N
c0320fe3-8a30-44b6-b5d3-8db62d33ef7e	saicharan.629@gmail.com	active	\N	2026-03-13 22:21:04.09	2026-03-28 22:20:31.951	\N	2026-03-13 22:21:04.090613	2026-03-13 22:21:04.090613	\N	\N
a424d8ac-a75a-4a35-a4a6-7b86452578f6	Nashville52002@yahoo.com	active	\N	2026-03-17 19:09:44.163	2026-03-20 19:04:10.771	\N	2026-03-17 19:09:44.16409	2026-03-17 19:09:44.16409	\N	\N
643e6e3a-fbf0-4b7b-8a20-6e7e9c9e5776	jnightmare15@gmail.com	active	\N	2026-03-17 22:25:43.096	2026-04-16 16:19:36.112	\N	2026-03-17 22:25:43.096615	2026-03-17 22:25:43.096615	\N	\N
4fe32892-67cd-45bc-b6a5-86f2033ba8d8	mnrealestate11@yahoo.com	active	\N	2026-03-18 10:35:53.121	2026-04-06 18:01:20.875	\N	2026-03-18 10:35:53.121981	2026-03-18 10:35:53.121981	\N	\N
c3fd7541-96b3-42ff-aaf6-626d7677bb76	donalddump77@gmail.com	active	\N	2026-03-18 11:35:52.523	2026-04-02 05:20:19.982	\N	2026-03-18 11:35:52.523375	2026-03-18 11:35:52.523375	\N	\N
6e172b2e-96f9-4be7-9fb4-82c3aed03585	bigboo87_05@yahoo.com	active	\N	2026-03-20 00:23:23.773	2026-04-13 21:53:31.236	\N	2026-03-20 00:23:23.773964	2026-03-20 00:23:23.773964	\N	\N
effedd98-b03a-4218-aae4-c6449bf646ca	bighomiie5150@gmail.com	active	\N	2026-03-23 19:13:47.401	2026-04-18 00:02:40.525	\N	2026-03-23 19:13:47.402111	2026-03-23 19:13:47.402111	\N	\N
34c03c97-6862-4b64-8a5c-9496aa2d4600	bear79072@gmail.com	active	\N	2026-03-23 19:39:20.709	2026-04-22 19:37:26.838	\N	2026-03-23 19:39:20.70968	2026-03-23 19:39:20.70968	\N	\N
73aa032b-85cf-4084-a4b5-584db2932f4a	bacon5693@gmail.com	active	\N	2026-03-21 20:47:28.245	2026-04-18 00:02:33.575	\N	2026-03-21 20:47:28.245913	2026-03-21 20:47:28.245913	\N	\N
8c19f0e7-509b-4057-85bf-0801031925ab	blackpagevideo1@gmail.com	active	\N	2026-03-21 20:53:55.167	2026-04-20 15:55:44.948	\N	2026-03-16 19:55:36.845145	2026-03-16 20:55:29.456158	\N	\N
4d013478-4a8f-4da4-9056-97a28e5a1368	jannylovesyou2@gmail.com	active	\N	2026-03-22 13:33:20	2026-04-22 10:00:00	\N	2026-03-22 13:35:46.205862	2026-03-24 02:04:07.567859	\N	I-E0FYDF9W96DR
7c02f078-c643-42bd-936c-9ec5aacf3d75	fridman2014@gmail.com	active	\N	2026-03-20 15:11:30	2026-04-20 10:00:00	\N	2026-03-20 15:15:43.181396	2026-03-20 16:04:42.98079	\N	I-M331RU0RFVY7
25dbbe1e-479c-477c-8e82-c7b31d13c697	youknowkevin9@gmail.com	active	\N	2026-03-22 01:12:30	2026-04-21 10:00:00	\N	2026-03-22 01:13:12.648896	2026-03-23 01:03:33.368769	\N	I-XBWH1CYE04YB
32618a62-abd0-4c8d-b2d6-7ee692a7a0be	kmusgrove82@aol.com	active	\N	2026-03-21 19:32:58	2026-04-21 10:00:00	\N	2026-03-21 19:33:46.386041	2026-03-25 00:11:20.506169	\N	I-FE5HEDLUSH90
38047bc7-e82c-407e-870f-86d0c1603f19	wildrosentx@gmail.com	active	\N	2026-03-23 02:51:06	2026-04-22 10:00:00	\N	2026-03-23 02:54:40.645246	2026-03-23 03:03:51.631523	\N	I-446E2YBB5JE7
3f777ba8-bd32-43ef-9be9-56ca3efd2071	bevo2169@gmail.com	active	\N	2026-03-21 11:19:35	2026-04-21 10:00:00	\N	2026-03-21 11:20:25.306286	2026-03-23 05:08:46.213331	\N	I-3H0L9W1G0F0D
\.


--
-- Data for Name: VideoSignal; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."VideoSignal" (id, call_id, from_email, to_email, signal_type, signal_data, created_date, updated_date) FROM stdin;
\.


--
-- Name: AboutVideo AboutVideo_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."AboutVideo"
    ADD CONSTRAINT "AboutVideo_pkey" PRIMARY KEY (id);


--
-- Name: AccessCode AccessCode_code_key; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."AccessCode"
    ADD CONSTRAINT "AccessCode_code_key" UNIQUE (code);


--
-- Name: AccessCode AccessCode_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."AccessCode"
    ADD CONSTRAINT "AccessCode_pkey" PRIMARY KEY (id);


--
-- Name: BlockedUser BlockedUser_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."BlockedUser"
    ADD CONSTRAINT "BlockedUser_pkey" PRIMARY KEY (id);


--
-- Name: BroadcastMessage BroadcastMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."BroadcastMessage"
    ADD CONSTRAINT "BroadcastMessage_pkey" PRIMARY KEY (id);


--
-- Name: EmailVerificationOTP EmailVerificationOTP_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."EmailVerificationOTP"
    ADD CONSTRAINT "EmailVerificationOTP_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetToken PasswordResetToken_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetToken PasswordResetToken_token_key; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."PasswordResetToken"
    ADD CONSTRAINT "PasswordResetToken_token_key" UNIQUE (token);


--
-- Name: ProfileVideo ProfileVideo_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."ProfileVideo"
    ADD CONSTRAINT "ProfileVideo_pkey" PRIMARY KEY (id);


--
-- Name: Reel Reel_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."Reel"
    ADD CONSTRAINT "Reel_pkey" PRIMARY KEY (id);


--
-- Name: SubscriptionSettings SubscriptionSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."SubscriptionSettings"
    ADD CONSTRAINT "SubscriptionSettings_pkey" PRIMARY KEY (id);


--
-- Name: UserProfile UserProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."UserProfile"
    ADD CONSTRAINT "UserProfile_pkey" PRIMARY KEY (id);


--
-- Name: UserSession UserSession_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."UserSession"
    ADD CONSTRAINT "UserSession_pkey" PRIMARY KEY (id);


--
-- Name: UserSubscription UserSubscription_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."UserSubscription"
    ADD CONSTRAINT "UserSubscription_pkey" PRIMARY KEY (id);


--
-- Name: User User_email_key; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_email_key" UNIQUE (email);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VideoSignal VideoSignal_pkey; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."VideoSignal"
    ADD CONSTRAINT "VideoSignal_pkey" PRIMARY KEY (id);


--
-- Name: BlockedUser unique_block; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."BlockedUser"
    ADD CONSTRAINT unique_block UNIQUE (blocker_email, blocked_email);


--
-- Name: UserSession unique_user_device; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."UserSession"
    ADD CONSTRAINT unique_user_device UNIQUE (user_email, device_id);


--
-- Name: UserProfile unique_user_profile; Type: CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."UserProfile"
    ADD CONSTRAINT unique_user_profile UNIQUE (user_email);


--
-- Name: idx_blockeduser_blocker; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_blockeduser_blocker ON public."BlockedUser" USING btree (blocker_email);


--
-- Name: idx_broadcast_from; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_broadcast_from ON public."BroadcastMessage" USING btree (from_email);


--
-- Name: idx_message_conversation; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_message_conversation ON public."Message" USING btree (conversation_id);


--
-- Name: idx_message_recipient; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_message_recipient ON public."Message" USING btree (recipient_email);


--
-- Name: idx_message_sender; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_message_sender ON public."Message" USING btree (sender_email);


--
-- Name: idx_otp_email; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_otp_email ON public."EmailVerificationOTP" USING btree (email);


--
-- Name: idx_otp_expires; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_otp_expires ON public."EmailVerificationOTP" USING btree (expires_at);


--
-- Name: idx_profilevideo_created_date; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_profilevideo_created_date ON public."ProfileVideo" USING btree (created_date);


--
-- Name: idx_profilevideo_user_email; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_profilevideo_user_email ON public."ProfileVideo" USING btree (user_email);


--
-- Name: idx_reel_created_date; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_reel_created_date ON public."Reel" USING btree (created_date);


--
-- Name: idx_reel_user_email; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_reel_user_email ON public."Reel" USING btree (user_email);


--
-- Name: idx_reset_token; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_reset_token ON public."PasswordResetToken" USING btree (token);


--
-- Name: idx_reset_token_expires; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_reset_token_expires ON public."PasswordResetToken" USING btree (expires_at);


--
-- Name: idx_user_email; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_user_email ON public."User" USING btree (email);


--
-- Name: idx_userprofile_email; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_userprofile_email ON public."UserProfile" USING btree (user_email);


--
-- Name: idx_usersession_device; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_usersession_device ON public."UserSession" USING btree (device_id);


--
-- Name: idx_usersession_email; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_usersession_email ON public."UserSession" USING btree (user_email);


--
-- Name: idx_usersubscription_email; Type: INDEX; Schema: public; Owner: popupapp
--

CREATE INDEX idx_usersubscription_email ON public."UserSubscription" USING btree (user_email);


--
-- Name: BlockedUser BlockedUser_blocked_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."BlockedUser"
    ADD CONSTRAINT "BlockedUser_blocked_email_fkey" FOREIGN KEY (blocked_email) REFERENCES public."User"(email) ON DELETE CASCADE;


--
-- Name: BlockedUser BlockedUser_blocker_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."BlockedUser"
    ADD CONSTRAINT "BlockedUser_blocker_email_fkey" FOREIGN KEY (blocker_email) REFERENCES public."User"(email) ON DELETE CASCADE;


--
-- Name: BroadcastMessage BroadcastMessage_from_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."BroadcastMessage"
    ADD CONSTRAINT "BroadcastMessage_from_email_fkey" FOREIGN KEY (from_email) REFERENCES public."User"(email) ON DELETE CASCADE;


--
-- Name: Message Message_receiver_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_receiver_email_fkey" FOREIGN KEY (receiver_email) REFERENCES public."User"(email) ON DELETE CASCADE;


--
-- Name: Message Message_sender_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_sender_email_fkey" FOREIGN KEY (sender_email) REFERENCES public."User"(email) ON DELETE CASCADE;


--
-- Name: ProfileVideo ProfileVideo_user_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."ProfileVideo"
    ADD CONSTRAINT "ProfileVideo_user_email_fkey" FOREIGN KEY (user_email) REFERENCES public."User"(email) ON DELETE CASCADE;


--
-- Name: Reel Reel_user_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."Reel"
    ADD CONSTRAINT "Reel_user_email_fkey" FOREIGN KEY (user_email) REFERENCES public."User"(email) ON DELETE CASCADE;


--
-- Name: UserProfile UserProfile_user_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."UserProfile"
    ADD CONSTRAINT "UserProfile_user_email_fkey" FOREIGN KEY (user_email) REFERENCES public."User"(email) ON DELETE CASCADE;


--
-- Name: UserSession UserSession_user_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."UserSession"
    ADD CONSTRAINT "UserSession_user_email_fkey" FOREIGN KEY (user_email) REFERENCES public."User"(email) ON DELETE CASCADE;


--
-- Name: UserSubscription UserSubscription_user_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."UserSubscription"
    ADD CONSTRAINT "UserSubscription_user_email_fkey" FOREIGN KEY (user_email) REFERENCES public."User"(email) ON DELETE CASCADE;


--
-- Name: VideoSignal VideoSignal_from_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."VideoSignal"
    ADD CONSTRAINT "VideoSignal_from_email_fkey" FOREIGN KEY (from_email) REFERENCES public."User"(email) ON DELETE CASCADE;


--
-- Name: VideoSignal VideoSignal_to_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: popupapp
--

ALTER TABLE ONLY public."VideoSignal"
    ADD CONSTRAINT "VideoSignal_to_email_fkey" FOREIGN KEY (to_email) REFERENCES public."User"(email) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict oNQvwQeA8UjJtvRt1MGvqoDiOLMxUpW1hQs9ZK6UUARRnNjwsIYteSAi3bBh9ac

