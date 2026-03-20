--
-- PostgreSQL database dump
--

\restrict Fnvi5D1s5oSgQIsswU9XKaucL6CSysxcPkvxzU2Cq5thBYCUrF5pPccZasGygm0

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
\.


--
-- Data for Name: EmailVerificationOTP; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."EmailVerificationOTP" (id, email, otp, expires_at, used, attempts, created_at) FROM stdin;
81415700-6acb-472b-bdbe-bf0130250585	danishwithfiverr326@gmail.com	565729	2026-03-14 06:20:10.341	t	1	2026-03-14 06:10:10.344218
73f5edfd-ef25-4609-a445-3c83f36fcae1	danishwithfiverr326@gmail.com	081485	2026-03-14 06:30:31.602	t	1	2026-03-14 06:20:31.604233
259a0a93-2dd6-4bd6-9977-f1df6b33d414	blinkz4all@gmail.com	395513	2026-03-14 10:10:55.146	t	1	2026-03-14 10:00:55.149101
140d8cfc-8635-4719-9566-660b39a1c57e	little0hollow@gmail.com	851785	2026-03-15 00:59:29.15	t	1	2026-03-15 00:49:29.152058
b057c0c0-ee62-4b34-84ed-6b91a09fab0b	jonesz521@yahoo.com	228029	2026-03-15 20:55:34.288	t	1	2026-03-15 20:45:34.290791
2bee2ff2-4ee1-4e50-8c73-b03668b14351	mnrealestate11@yahoo.com	980250	2026-03-16 01:52:57.26	t	1	2026-03-16 01:42:57.261427
6f59cdde-90c8-41f7-834a-fa30157dcfd6	fridman2014@gmail.com	591787	2026-03-16 18:16:08.157	t	1	2026-03-16 18:06:08.158755
e656b83e-b440-49ed-9d4e-c535f5ab857f	yourstrulykg469@gmail.com	638706	2026-03-16 22:35:49.849	t	1	2026-03-16 22:25:49.850162
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."Message" (id, sender_email, receiver_email, recipient_email, content, read, is_read, conversation_id, attachment_url, created_date, updated_date, deleted_for) FROM stdin;
c6cb9016-27d9-4e8c-a4b1-7b0e3b9ffced	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	t	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-17 09:58:17.658658	{}
5dd8240a-0dd0-47ce-b16f-8ea302a9fd32	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	t	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:58:17.659163	{}
5ea1d0d8-c5dc-4f4e-a50e-8e853aba32eb	blackpagevideo1@gmail.com	Nashville52002@yahoo.com	Nashville52002@yahoo.com	deleted_for schema check	t	f	\N	\N	2026-03-12 21:12:47.28934	2026-03-13 01:11:55.84871	{blackpagevideo1@gmail.com}
a178fc12-6816-4fd6-ae41-ff348dc639da	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	t	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-17 10:13:29.748585	{}
48bafa07-1fd5-4b86-b1c6-a71068df8fbf	blackpagevideo1@gmail.com	Nashville52002@yahoo.com	Nashville52002@yahoo.com	deleted_for schema check	t	f	\N	\N	2026-03-12 21:13:03.250112	2026-03-13 01:12:02.887846	{blackpagevideo1@gmail.com,Nashville52002@yahoo.com}
900f1c2e-ae2b-42e1-a110-0b402ced5839	blackpagevideo1@gmail.com	danishrehman78677@gmail.com	\N	Can 	t	f	\N	\N	2026-03-13 00:18:42.838596	2026-03-13 16:21:10.118971	{}
6a475694-8e37-4e31-a9f8-845205b31126	blackpagevideo1@gmail.com	danishrehman78677@gmail.com	\N	Hello	t	f	\N	\N	2026-03-13 05:02:27.592535	2026-03-13 16:21:10.129456	{}
1b0a4132-8281-4781-9193-a95c26640ac6	danishrehman78677@gmail.com	danishcreates786@gmail.com	\N	mmm	t	f	\N	\N	2026-03-13 16:22:35.12281	2026-03-13 16:23:14.2592	{danishcreates786@gmail.com}
ddd013ba-c8e2-4b7c-9e81-367a0af6d5df	saicharan.629@gmail.com	Nashville52002@yahoo.com	\N	Hey	f	f	\N	\N	2026-03-13 22:23:41.226416	2026-03-13 22:23:41.226416	{}
39806e6b-c47d-4243-bafe-fd655462754b	saicharan.629@gmail.com	blackpagevideo1@gmail.com	\N	Hey	f	f	\N	\N	2026-03-13 22:24:04.570955	2026-03-13 22:24:04.570955	{}
3dbaa902-f4f4-476c-8b1d-1247beefbf9b	saicharan.629@gmail.com	contact@popupplay.fun	\N	Hey	t	f	\N	\N	2026-03-13 22:24:26.048976	2026-03-13 22:25:53.219504	{}
40bbd4db-e364-49d3-971d-f014f60f8a0d	danishrehman78677@gmail.com	danishcreates786@gmail.com	\N	hey	t	f	\N	\N	2026-03-14 04:35:46.256321	2026-03-14 04:35:54.455908	{}
be430c3a-a2ca-43b1-b1cf-385a494505f8	contact@popupplay.fun	saicharan.629@gmail.com	\N	Hey	f	f	\N	\N	2026-03-14 00:44:40.819924	2026-03-14 07:21:01.345622	{contact@popupplay.fun}
c56f2849-afca-4fe9-969b-4d77012dd2b0	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
a41ffe02-3548-4d1f-97f7-0258b73792e1	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
150f182e-7cbf-4a4a-b79a-58f71dc0b4c1	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
c04d2b13-b57d-4c04-af6a-17e8c5cb3c29	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
e4ad6f40-6a6c-4768-b3ef-b0ad6c6f0ba5	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
07822681-736c-486b-97d0-42f368b0eec6	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
c873a655-01ee-43ab-99de-52a60b3995f8	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
98be778d-cec4-4bb2-b5ae-dc51019e9aae	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
0b9afa04-f377-4620-adc8-6517ea98db0c	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
ed451a6d-e8bf-4157-80b9-3618566ada7d	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **New Updates**\n\nWe are doing new updates.	f	f	\N	\N	2026-03-15 04:05:11.210615	2026-03-15 04:05:11.210615	{}
68f3aafc-b9e8-4cf7-8f4b-f12b8c120de0	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
3fc11e7f-c328-40f8-8eb7-7127cff9e5b9	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
5724ac52-beda-41fa-a9c4-0ea354224b41	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
6dac81dd-2cb6-4cb2-be64-f7c875064809	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
e94ea82d-ae7a-4f56-8ad5-8d8b118bcc54	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
5f59b3da-6d54-41c8-b342-5db6185a7891	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
6cdae6c2-48bc-49d6-9e69-a2cb0e74264a	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
83feafa6-2bb3-41d5-b868-b2075f9ca441	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
4dafcca3-1c1f-4613-8012-bc3adf4400f1	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
b312e734-194f-47fb-9244-8b640108bb35	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
6b270e16-03b9-4dff-8e8f-7d12a058ba47	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
d1937501-0034-46ff-90c3-7b2d48054960	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
c7b775ec-635c-4fe2-aaf8-8b6f7bf07292	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
980965a3-db30-4c0c-8834-d4a086ed51c0	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
a5c2b0b8-b931-40ed-b4ca-d7b2d707fa5a	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	f	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 09:56:29.21956	{}
289a391b-a04f-45bc-91f0-5ea1741b8598	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
22e9ba1e-4a93-4cdb-8ae6-33c17add06e2	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
6af981e3-80d7-452f-9310-6ca6556cef16	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
12a1fb4f-8e77-456e-b1a6-d90b6a068634	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
c1c4a55c-67b3-4ff4-a0fd-8e3f4cd23f0a	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
ff325443-226d-48a7-bf16-98843c03a8ab	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
be2e71ba-4cac-46d8-becc-a0e838383671	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
0764494c-9370-4456-8f2a-5cb227fb3df4	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
d7153860-6989-4c5d-b593-6ec74b129bdc	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
1a8f6341-fb2a-45bb-916c-cc00ded46305	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
5c180cb8-121a-4131-9e44-ccc855f8233d	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
3fd2254e-07fc-4a21-a1c8-26a6d20e48b5	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
eb77b9b4-398c-47b2-8509-92e10f4932bb	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
e4772861-eb90-4961-a0a4-1e2065702097	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
c8994972-8a54-4e74-96fc-5292ce88e301	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
aa4e1286-5fdb-4590-87ab-33ddaa8327bb	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	f	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:03:39.259627	{}
33372481-cf44-4ce3-bd80-d94419785c6a	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
66737613-e07e-487a-a8de-26d14fd2d0c7	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
5b282a1d-0110-4cd4-b68e-2e1dd30f2b64	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
27c9e14e-abee-4cb7-8fe2-5a9c283159db	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **Test Broadcast**\n\nThis is the broadcast message which should be sending email also.	t	f	\N	\N	2026-03-17 09:56:29.21956	2026-03-17 10:13:29.763001	{}
a4f18a05-425a-402c-b62e-1a1da192a18e	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
25c34bc1-2e41-4c2f-8c41-3225e9f2231b	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
e227983c-87d0-4812-9f48-de0dff7f19a6	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
be870a03-5152-4258-ac5c-1e2e6369bc09	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
1e63f084-e451-4372-b5be-326065f1a459	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
860a36f4-26d6-4183-878b-f20deb2d0693	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
24d2cd30-6324-4ccb-ba96-a75e9bfd7f53	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
0be24ae7-ad3b-4848-afb3-82756e0a7c43	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
90f12b21-b554-4500-8b65-80a0ab7e44c4	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
c9a404e9-e5f8-4d8f-b27e-901704b051e9	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
a184b711-c2ff-4e61-bf0f-9817cb7c2a33	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
9f59f03f-585e-4ce2-94df-febd418dabbd	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
0ddfda3f-e990-4aaf-8cba-0e47226beeed	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:04:05.036774	{}
a4b60769-8b16-4388-ade3-c055be3a3d0d	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
ad81bbec-b1b0-4d67-b597-a8382c7cf185	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
c633a023-12d0-4941-a3a8-c9ff68eb5633	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
81ea1eab-f7d1-4863-9705-271ba0f53ba3	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
8564729e-f1c7-4bf0-8b76-d3f83bd67549	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
02505546-5c2f-4934-8898-15623cf689cb	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
6e22b860-6fa8-4a44-87e1-b18b84d19d6f	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
8e1db37e-a9d9-419d-90cf-1ea3d9e2597b	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
03e9a6e9-a983-44bc-af68-b929e4f9ddad	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
8af1b01d-085e-4e9a-a13a-a2587a61a423	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
a0e43e58-ed31-4c4d-bd4d-2d72c1f3f313	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
6beaddcb-f71f-4a49-8374-44f54aa6101c	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
e2e7e12f-3095-450c-a334-a5fdbf8f45e0	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
0bb7c515-07da-4038-b502-9f70c78acf79	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
b6b9a335-25a1-44e5-8eb5-2d59871cb642	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
952a39c0-474c-45ed-812f-ca9aca538488	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	f	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:04:18.024356	{}
4fd5f17d-9517-46a4-ba4d-fcc91e355690	contact@popupplay.fun	danishcreates786@gmail.com	danishcreates786@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
ee4ca689-850a-4e83-bb3c-ff3c7594b6e3	contact@popupplay.fun	saicharan.629@gmail.com	saicharan.629@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
ad656f95-9a59-4bee-ae9c-f901ff50dc78	contact@popupplay.fun	Nashville52002@yahoo.com	Nashville52002@yahoo.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
9b26484b-97ae-4ddd-9c7d-00ae006a602d	contact@popupplay.fun	oquelizelaya@gmail.com	oquelizelaya@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
09bf80a8-bd7a-44a4-a9de-69bfa25cd213	contact@popupplay.fun	msanches010@outlook.com	msanches010@outlook.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
a0d9988e-f9fb-4c77-a10c-3e1b2550f899	contact@popupplay.fun	Blackpagevideo1@gmail.com	Blackpagevideo1@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
7a4d7c24-dfd3-40b9-a463-cb05cd2eeea3	contact@popupplay.fun	danishwithfiverr326@gmail.com	danishwithfiverr326@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
bc67ac98-64e4-4be0-b123-4e39d19a0e66	contact@popupplay.fun	domsammie02@gmail.com	domsammie02@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
0db3834e-55fc-4cdd-b436-de1711609611	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **test**\n\ntest	t	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:13:29.751191	{}
673d46fc-8bc7-478e-b077-9c2411220b1e	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	t	f	\N	\N	2026-03-17 10:04:18.024356	2026-03-17 10:13:29.75418	{}
440555e4-16c5-4fef-b758-a99f2582ef93	contact@popupplay.fun	blackpagevideo1@gmail.com	blackpagevideo1@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
d3ac4b2b-142c-430a-95f2-10b3f6bd7ca5	contact@popupplay.fun	blinkz4all@gmail.com	blinkz4all@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
0da867a4-3372-4877-b5cc-f5f71696d5e0	contact@popupplay.fun	little0hollow@gmail.com	little0hollow@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
d32feb15-185e-4974-a82b-cc84fcd96dbe	contact@popupplay.fun	jonesz521@yahoo.com	jonesz521@yahoo.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
e26a32f1-fc6d-4914-b681-9fc6124a9206	contact@popupplay.fun	mnrealestate11@yahoo.com	mnrealestate11@yahoo.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
cdc38757-29c3-45ee-9a40-19f3dc2c28d9	contact@popupplay.fun	ansibhai16@gmail.com	ansibhai16@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
303829df-8e52-4b62-8595-1d07d313fa56	contact@popupplay.fun	fridman2014@gmail.com	fridman2014@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
0216c2d2-bcf3-42ae-a508-4d53b878691f	contact@popupplay.fun	yourstrulykg469@gmail.com	yourstrulykg469@gmail.com	📢 **test**\n\ntest	f	f	\N	\N	2026-03-17 10:07:14.86512	2026-03-17 10:07:14.86512	{}
33a8227b-97ad-40d5-bd46-9c57d9b96b5a	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **Broadcast Email Test Manual**\n\nmanual test	t	f	\N	\N	2026-03-17 10:04:05.036774	2026-03-17 10:13:29.744828	{}
bad47743-e949-43e8-8e29-5347f193b2a4	contact@popupplay.fun	danishrehman78677@gmail.com	danishrehman78677@gmail.com	📢 **Broadcast Email Test 100339**\n\nThis is a server-side test to verify broadcast email delivery.	t	f	\N	\N	2026-03-17 10:03:39.259627	2026-03-17 10:13:29.744584	{}
49ec7f9f-c080-4f6c-b426-f833fe4b4121	danishrehman78677@gmail.com	danishcreates786@gmail.com	\N	hey	f	f	\N	\N	2026-03-17 10:13:34.645932	2026-03-17 10:13:34.645932	{}
\.


--
-- Data for Name: PasswordResetToken; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."PasswordResetToken" (id, email, token, expires_at, used, created_at) FROM stdin;
\.


--
-- Data for Name: ProfileVideo; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."ProfileVideo" (id, user_email, video_url, caption, views, created_date, updated_date) FROM stdin;
eaa7294f-1618-4fef-983c-79ea15dc18e9	danishrehman78677@gmail.com	https://popupplay.fun/api/uploads/1773472168987_a9dfe2ad409469ab1882dc2c4016ced0.mp4	\N	1	2026-03-14 07:09:29.293393	2026-03-14 07:10:24.783716
029fa6ca-a07a-4e03-a01b-a8094862642a	blackpagevideo1@gmail.com	https://popupplay.fun/api/uploads/1773540889580_1157f27601c268c6aee895819c5a4c87.mov	\N	2	2026-03-15 02:14:49.705478	2026-03-15 04:25:02.424134
384be950-9655-4985-ac15-5df0782ab953	blinkz4all@gmail.com	https://www.popupplay.fun/api/uploads/1773482780353_5b246bf2f3b3874459413f9966fff4b5.mp4	\N	5	2026-03-14 10:06:20.640837	2026-03-15 22:18:06.034928
\.


--
-- Data for Name: Reel; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."Reel" (id, user_email, video_url, caption, duration, views, created_date, updated_date) FROM stdin;
fab7040c-2dc1-46da-a3f6-3601feaa5e36	blackpagevideo1@gmail.com	https://popupplay.fun/api/uploads/1773358027006_7d4d50bb4d0f354b7c5e7259a59f6356.mov		\N	114	2026-03-12 23:27:41.183261	2026-03-17 10:23:51.943615
78d295c3-0d3a-4f7b-a774-dcfef80ec8fe	blackpagevideo1@gmail.com	https://popupplay.fun/api/uploads/1773540889580_1157f27601c268c6aee895819c5a4c87.mov		\N	35	2026-03-15 02:14:55.654334	2026-03-17 07:45:10.221594
eb0047b2-1973-4ed5-9c1f-1e372299738f	Nashville52002@yahoo.com	https://popupplay.fun/api/uploads/1773364447819_d1bccc5b8ce2687ec146027e862bcf5c.mov		\N	81	2026-03-13 01:14:10.589245	2026-03-16 19:29:36.438187
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
660faf5a-1e96-4652-bea3-ad56ef6d4305	danishcreates786@gmail.com	Danish Creates	oauth_user	2026-03-13 16:16:39.536998	2026-03-13 16:16:39.536998	popupapp	t
f613c96e-3a47-4c22-8afd-57e9175d6c5c	saicharan.629@gmail.com	Sai Charan	oauth_user	2026-03-13 22:11:15.011848	2026-03-13 22:11:15.011848	popupapp	t
9532467c-246e-4b52-b537-4e5f727ea95d	contact@popupplay.fun	contact	$2b$12$dwElyE0/VF2MAdzseaoWoOwV/6Ynh8u03pouDELG/kGN4A86drr0C	2026-03-12 21:15:28.808349	2026-03-12 21:15:28.808349	admin	t
aa5f00ed-f7c9-437b-a2b5-cdcbdfe34636	Nashville52002@yahoo.com	Nashville52002	RnJlYWtzMjY=	2026-03-12 19:43:22.2021	2026-03-12 19:43:22.2021	popupapp	t
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
\.


--
-- Data for Name: UserProfile; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."UserProfile" (id, user_email, display_name, name, bio, avatar_url, age, gender, interested_in, interests, hobbies, looking_for, city, state, zip_code, country, is_popped_up, has_ever_popped_up, popup_message, photos, videos, location, latitude, longitude, last_location_update, created_date, updated_date, email_notifications_enabled) FROM stdin;
a63bb54c-323a-43fc-984a-a314a69c8f82	Nashville52002@yahoo.com	Nashville52002	\N	Love bbc	https://popupplay.fun/api/uploads/1773364457730_b278dbbf12b88bfb06b78dbdf3bd8367.jpeg	45	female	men	{Bbc,Cuckold}		Bbc for the wife.	Antioch	\N	37011	\N	f	t		{https://popupplay.fun/api/uploads/1773364428769_11c042fa7279afab4c29303a4919552e.jpeg}	{https://popupplay.fun/api/uploads/1773364447819_d1bccc5b8ce2687ec146027e862bcf5c.mov}	Fort Worth	32.73763269	-97.20848996	2026-03-13 01:15:02.229	2026-03-12 19:43:23.457656	2026-03-13 01:15:02.435663	t
0635a8d0-c0ac-41e1-95bf-1fc45ebcfb62	danishrehman78677@gmail.com	danishrehman78677	\N	Here is the bio.	https://popupplay.fun/api/uploads/1773418398685_e4d1ab04568633557f7607dcb709ddb0.jpeg	22	male	women	{interest}	hobby	looking for someone.	Dubuque	\N	52001	\N	t	t	hi	{}	{}	Lahore	31.55230720	74.29488640	2026-03-17 10:13:19.989	2026-03-12 20:16:51.387358	2026-03-17 10:13:20.127823	t
1122b735-ffc3-4ef3-9b71-879660476c02	danishcreates786@gmail.com	Danish Creates	\N	This is the id of danish creates.	https://popupplay.fun/api/uploads/1773418836251_3128b5d82fdfae770118472b9e42351f.jpg	22	male	women	{daniint}	tourism	looking for someone.	Dubuque	\N	52003	\N	t	t	Just joined! Looking to connect.	{}	{}	Lahore	31.55230720	74.29488640	2026-03-17 10:27:53.165	2026-03-13 16:16:39.53879	2026-03-17 10:27:53.302627	t
fb67e23f-1d98-4254-8235-a21fcd6cac01	contact@popupplay.fun	Admin	contact	We connect swingers.	https://popupplay.fun/api/uploads/1773443660682_71d269f39d5a9255ef0fb761e33cbe95.jpeg	39	male	women	{"Watch Dog"}		Connect Couples	Irving	\N	75062	\N	t	t	Looking to play	{https://popupplay.fun/api/uploads/1773440324971_35d4d55a88752db863ebc7521f9dd2ae.jpeg}	{}	Location Found	31.55230720	74.29488640	2026-03-17 10:35:02.122	2026-03-12 21:15:28.810575	2026-03-17 10:35:02.259317	t
803b692a-3b86-4c13-a673-5cef6e7060fa	oquelizelaya@gmail.com	oquelizelaya	\N	\N	\N	\N	\N	\N	{}	\N	\N	Euless	Texas	75261	United States	t	t	Just joined! Looking to connect.	{}	{}	Haltom City	32.80401400	-97.26088150	2026-03-13 21:49:54.145	2026-03-13 21:49:54.127716	2026-03-13 22:40:08.989619	t
d80b3408-cd73-45e9-b682-1451f9c17849	msanches010@outlook.com	msanches010	\N		\N	\N			{}	\N		Schipluiden	South Holland	2636kb	Netherlands	t	t	Just joined! Looking to connect.	{}	{}	Rotterdam	51.93726459	4.49382301	2026-03-14 05:27:36.612	2026-03-14 05:27:07.618999	2026-03-15 02:07:26.205581	t
8839b80a-84a5-43f0-8a49-bc0d92b21b73	jonesz521@yahoo.com	BBC_4_U	\N	Just looking for fun 	https://www.popupplay.fun/api/uploads/1773608008940_821e68a1269ed5737c41e70f221166dc.jpg	35	male	everyone	{}	Playing 	Fwb,couples and ladies 	Fort Worth	TX	76147	United States	t	t	Just joined! Looking to connect.	{https://www.popupplay.fun/api/uploads/1773608079994_907880d07b923d2964fd5843280d816c.jpg}	{}	Watauga	32.86378430	-97.26085130	2026-03-15 20:56:30.37	2026-03-15 20:54:45.344883	2026-03-15 20:56:30.505742	t
5e502b32-88c2-4df4-9bea-d5afaeb9a451	ansibhai16@gmail.com	Ansi Bhai	\N		https://lh3.googleusercontent.com/a/ACg8ocL3_W3zvhjnk9wwSchZsLv6ZkDj3PWEIv7x4jdlPIGsM42XqA=s96-c	18	male	women	{"hot girls",baddies}	badminton, book reading, insta scrolling				05450		t	t	Just joined! Looking to connect.	{}	{}	Faisalabad City Tehsil	31.37090000	73.03360000	2026-03-16 17:59:50.848	2026-03-16 14:18:14.640616	2026-03-16 18:00:01.101405	t
0032bb6f-933e-4f25-a800-c036e9f1b227	mnrealestate11@yahoo.com	MNsexy2	\N	Late 30’s couple who keep in shape, love the outdoors and spontaneous fun!  Solo play occasionally 	https://popupplay.fun/api/uploads/1773625871497_b7c147df6121624d5597c7006605e03a.jpeg	39	male	everyone	{MFM,MFF,MFMF,Swinger,Solo}	Anything outdoors!  Boating, fishing, hunting, riding, aviation. 	Very open 			55379		t	t	Minnesota 	{https://popupplay.fun/api/uploads/1773625692806_096de7fd66b09bcf8d1de10a394332a2.jpeg}	{}		\N	\N	2026-03-16 01:52:04.985	2026-03-16 01:51:18.007359	2026-03-16 01:52:05.187106	t
cd31454a-60b3-4092-ba53-897d95bc13dc	blinkz4all@gmail.com	Monayy😇👅	\N	Thickie 🥰😜	https://www.popupplay.fun/api/uploads/1773482623368_a4ac7f1f7d5531da3b97e198e7e7a729.jpeg	33	female	men	{}	Video games and dancing 	Fun 	Los Angeles	\N	90001	\N	t	t	Just joined! Looking to connect.	{https://www.popupplay.fun/api/uploads/1773482724303_b5fa00d13ed33783f59010cc32d28ab9.jpeg,https://www.popupplay.fun/api/uploads/1773482724304_002e357f7ce7c19b54ac15ef37f1074c.jpeg,https://www.popupplay.fun/api/uploads/1773482724313_5c80bdc4f9b02cee6dc2b2cf09a8f3aa.jpeg,https://www.popupplay.fun/api/uploads/1773482725135_d5e9a8e0e18ecac508095782a864fbd7.jpeg,https://www.popupplay.fun/api/uploads/1773482725134_44b3972af758ca90de0a0d9e008f459a.jpeg}	{}	Kabba	7.82169110	6.06742470	2026-03-14 10:07:56.219	2026-03-14 10:06:29.961024	2026-03-14 10:07:56.358039	t
922f3643-f946-4a11-b8a5-527c599a2e5f	Blackpagevideo1@gmail.com	Blackpagevideo1	\N	This is the bio	https://popupplay.fun/api/uploads/1773462308565_ae2a1df042f00e96822e5f7dbc5a48fd.jpeg	25	male	women	{interest}			Dubuque	IA	52001	United States	t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1773463306025_7b9f588d6078f98a1078fbaf89192cf3.jpeg}	{}	Lahore	31.55230720	74.29160960	2026-03-14 07:08:32.228	2026-03-14 04:13:47.679898	2026-03-14 07:08:32.37211	t
f6885796-bbd4-46ed-bdd4-69515c49b940	blackpagevideo1@gmail.com	Bbc for Wives	\N	We set up parties for milfs	https://popupplay.fun/api/uploads/1773440001322_318e974fc27d9c88d47594bb18fee2cf.jpeg	38	male	women	{"Bbc parties",Bbc,Milfs,Hotwives}		Swingers into bbc	Fort Worth	\N	76112	\N	t	t	Where the freaks?	{https://popupplay.fun/api/uploads/1773352604343_e3de087e0d9d586fc40ef8fdefca0c04.jpeg,https://popupplay.fun/api/uploads/1773352613606_d9e610a364d954b88109751204041e77.jpeg,https://popupplay.fun/api/uploads/1773352613608_0b5d12a68b466dbb833012ba6c961564.jpeg}	{https://popupplay.fun/api/uploads/1773358027006_7d4d50bb4d0f354b7c5e7259a59f6356.mov}	Fort Worth	32.73763421	-97.20848743	2026-03-17 09:44:53.926	2026-03-12 19:41:16.299447	2026-03-17 09:44:54.022376	t
0fd5f1cf-a54d-4813-b3a5-969028f512a6	saicharan.629@gmail.com	Sai Charan	\N		https://lh3.googleusercontent.com/a/ACg8ocL9_gKoFrnf5QVdTioYDBG074qrxkTmJctYFE7NqGo4oQu6OiQ=s96-c	35	male	women	{}			Melissa	\N	75454	\N	t	t	Just joined! Looking to connect.	{}	{}	Melissa	33.29078989	-96.54071587	2026-03-15 01:05:51.654	2026-03-13 22:11:15.013605	2026-03-15 01:05:51.695104	t
903706ce-e27a-44bc-8621-fe9605062cee	danishwithfiverr326@gmail.com	Danish Rehman	\N	This is the bio	https://popupplay.fun/api/uploads/1773472680059_0534f5446086d85cbfd4c616372f4b96.jpeg	22	male	women	{}			Los Angeles	\N	90001	\N	t	t	Just joined! Looking to connect.	{}	{}	Lahore	31.55230720	74.29488640	2026-03-17 10:28:56.54	2026-03-14 07:15:45.35777	2026-03-17 10:28:56.677479	t
c43f0696-24ff-4f6f-993f-fbfca3587c93	domsammie02@gmail.com	DOMSAMMIES	\N		https://popupplay.fun/api/uploads/1773479253303_90f3842d750a9653e029497b7920a7d4.jpeg	45	female	everyone	{Bbc,Dominatrix}		Bdsm and more	Irving		75062		t	t	Just joined! Looking to connect.	{https://popupplay.fun/api/uploads/1773479231812_6945fe3f925bfc8c07ca1fafd55b9ee1.jpeg}	{}	Fort Worth	32.73750480	-97.20873003	2026-03-14 09:09:39.891	2026-03-14 09:05:24.449518	2026-03-15 01:19:50.552242	t
9924e1af-d4f4-4801-b382-6b83dcd4c036	little0hollow@gmail.com	Blain47 	\N	Looking to have some fun. Can't message here, you can message me @blain on telegram.	https://popupplay.fun/api/uploads/1773536647744_50f4c7d1fda4e0a6d50b41d6ccec1280.jpg	36	male	women	{Sex}			Duncanville		75116		t	t	Just joined! Looking to connect.	{}	{}	Duncanville	32.66326400	-96.92126150	2026-03-16 13:27:01.189	2026-03-15 01:04:59.172532	2026-03-16 13:27:01.514131	t
b225efa4-1c7b-47a8-a33b-5969a7af4de6	cfpeters17@gmail.com	Chris Peters	\N	\N		\N	\N	\N	{}	\N	\N	\N	\N	\N	\N	f	f	\N	{}	{}	\N	\N	\N	\N	2026-03-17 10:38:16.827058	2026-03-17 10:38:16.827058	t
ebd4082d-e44b-46c2-ba08-09b51f9aac41	fridman2014@gmail.com	fridman2014	\N		https://popupplay.fun/api/uploads/1773684471044_27747a96300ffdfaa83df192fe09c765.jpeg	29	male	women	{}					28533		t	t	Just joined! Looking to connect.	{}	{}	Havelock	34.88881911	-76.91260587	2026-03-16 18:10:23.111	2026-03-16 18:07:52.5611	2026-03-16 18:10:23.141041	t
\.


--
-- Data for Name: UserSession; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."UserSession" (id, user_email, device_id, last_active, user_agent, created_date, updated_date) FROM stdin;
8f64e3b4-bf9a-4088-a698-8d4e0c3d65db	blinkz4all@gmail.com	device_1773270512843_6gsm38g7e	2026-03-14 18:30:59.391	Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/135.0.7049.83 Mobile/15E148 Safari/604.1	2026-03-14 10:01:12.322649	2026-03-14 18:30:59.544414
91fd6e34-0567-4dd2-9661-6804a0e5d371	fridman2014@gmail.com	device_1773684424500_sr1wfn0y9	2026-03-16 22:16:43.347	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1	2026-03-16 18:25:26.496439	2026-03-16 22:16:43.395036
ff71ec54-e664-491e-bfcb-36b4d8ca1111	mnrealestate11@yahoo.com	device_1773663122969_taalsd73z	2026-03-16 12:12:19.171	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15	2026-03-16 12:12:03.342914	2026-03-16 12:12:19.300916
1766cd4c-0ae7-486a-8b2c-3b510050f06d	ansibhai16@gmail.com	device_1773670685641_f7e8ghvzc	2026-03-16 18:03:19.125	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36	2026-03-16 14:18:16.517087	2026-03-16 18:03:29.362026
526f8705-bca8-45c1-b246-c162ae23b813	jonesz521@yahoo.com	device_1771109115287_7k0ukf7bi	2026-03-16 16:54:58.49	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36	2026-03-15 22:40:41.821159	2026-03-16 16:54:58.624423
644ac4ba-db93-4ff1-ac46-7f6d3367ffc9	msanches010@outlook.com	device_1773466024012_2h3p9pjnz	2026-03-14 05:28:04.247	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1	2026-03-14 05:27:04.289812	2026-03-14 05:28:04.316218
d04163e3-f2da-4ae1-88b3-4066a0abaef2	blackpagevideo1@gmail.com	device_1773690986255_9xp6obrrs	2026-03-17 09:44:54.252	Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.7 Mobile/15E148 Safari/604.1	2026-03-17 09:44:25.617745	2026-03-17 09:44:54.370815
ee1f36b2-9827-4c66-ad56-a297f0009c30	cfpeters17@gmail.com	device_1773743897155_dho94xvoy	2026-03-17 10:41:47.567	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1	2026-03-17 10:38:17.407708	2026-03-17 10:41:47.642306
4888164b-57ac-4011-8cec-13e000539640	contact@popupplay.fun	device_1773743668989_dst5bwq8u	2026-03-17 10:41:52.971	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-03-17 10:34:57.805506	2026-03-17 10:41:53.109045
5bb13310-450f-47e0-a5b8-125aef219abc	danishrehman78677@gmail.com	device_1773546122926_d2cddsoj8	2026-03-17 10:21:57.857	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-03-15 03:42:29.867202	2026-03-17 10:21:57.994533
389327f1-cbf1-4bc4-bb94-9421896fd120	saicharan.629@gmail.com	device_1773536749238_52mbbm8rf	2026-03-15 01:06:27.365	Mozilla/5.0 (iPhone; CPU iPhone OS 26_3_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/411.0.879111500 Mobile/15E148 Safari/604.1	2026-03-15 01:05:49.394278	2026-03-15 01:06:27.403779
268ca03c-be18-471f-aa96-d92800575859	danishcreates786@gmail.com	device_1773743107777_7i0prilyd	2026-03-17 10:32:53.191	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-03-17 10:25:08.434802	2026-03-17 10:32:53.332271
edbe8eb8-6012-4e3e-a131-d53a76242816	danishwithfiverr326@gmail.com	device_1773742984266_gt8vcoh2n	2026-03-17 10:32:56.264	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	2026-03-17 10:23:25.34465	2026-03-17 10:32:56.401627
\.


--
-- Data for Name: UserSubscription; Type: TABLE DATA; Schema: public; Owner: popupapp
--

COPY public."UserSubscription" (id, user_email, status, plan, start_date, end_date, stripe_subscription_id, created_date, updated_date, paypal_order_id, paypal_subscription_id) FROM stdin;
311d5ed8-86da-4159-8ba8-6bc35d972c96	danishcreates786@gmail.com	active	\N	2026-03-13 16:36:24.893	2026-04-11 21:16:46.256	\N	2026-03-13 16:36:24.893983	2026-03-13 16:36:24.893983	\N	\N
fe3710fe-4d9d-449d-8376-1ea9f8ae559e	danishrehman78677@gmail.com	active	\N	2026-03-13 16:40:18.393	2026-04-12 16:40:04.024	\N	2026-03-13 16:40:18.393865	2026-03-13 16:40:18.393865	\N	\N
c0320fe3-8a30-44b6-b5d3-8db62d33ef7e	saicharan.629@gmail.com	active	\N	2026-03-13 22:21:04.09	2026-03-28 22:20:31.951	\N	2026-03-13 22:21:04.090613	2026-03-13 22:21:04.090613	\N	\N
8c19f0e7-509b-4057-85bf-0801031925ab	blackpagevideo1@gmail.com	cancelled	\N	2026-03-16 19:55:36.844	2026-03-16 20:55:29.456158	\N	2026-03-16 19:55:36.845145	2026-03-16 20:55:29.456158	\N	\N
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

\unrestrict Fnvi5D1s5oSgQIsswU9XKaucL6CSysxcPkvxzU2Cq5thBYCUrF5pPccZasGygm0

