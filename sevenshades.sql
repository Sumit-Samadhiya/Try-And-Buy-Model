-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 17, 2024 at 09:17 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sevenshades`
--

-- --------------------------------------------------------

--
-- Table structure for table `auth_group`
--

CREATE TABLE `auth_group` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auth_group_permissions`
--

CREATE TABLE `auth_group_permissions` (
  `id` bigint(20) NOT NULL,
  `group_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auth_permission`
--

CREATE TABLE `auth_permission` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `content_type_id` int(11) NOT NULL,
  `codename` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `auth_permission`
--

INSERT INTO `auth_permission` (`id`, `name`, `content_type_id`, `codename`) VALUES
(1, 'Can add log entry', 1, 'add_logentry'),
(2, 'Can change log entry', 1, 'change_logentry'),
(3, 'Can delete log entry', 1, 'delete_logentry'),
(4, 'Can view log entry', 1, 'view_logentry'),
(5, 'Can add permission', 2, 'add_permission'),
(6, 'Can change permission', 2, 'change_permission'),
(7, 'Can delete permission', 2, 'delete_permission'),
(8, 'Can view permission', 2, 'view_permission'),
(9, 'Can add group', 3, 'add_group'),
(10, 'Can change group', 3, 'change_group'),
(11, 'Can delete group', 3, 'delete_group'),
(12, 'Can view group', 3, 'view_group'),
(13, 'Can add user', 4, 'add_user'),
(14, 'Can change user', 4, 'change_user'),
(15, 'Can delete user', 4, 'delete_user'),
(16, 'Can view user', 4, 'view_user'),
(17, 'Can add content type', 5, 'add_contenttype'),
(18, 'Can change content type', 5, 'change_contenttype'),
(19, 'Can delete content type', 5, 'delete_contenttype'),
(20, 'Can view content type', 5, 'view_contenttype'),
(21, 'Can add session', 6, 'add_session'),
(22, 'Can change session', 6, 'change_session'),
(23, 'Can delete session', 6, 'delete_session'),
(24, 'Can view session', 6, 'view_session'),
(25, 'Can add main category', 7, 'add_maincategory'),
(26, 'Can change main category', 7, 'change_maincategory'),
(27, 'Can delete main category', 7, 'delete_maincategory'),
(28, 'Can view main category', 7, 'view_maincategory'),
(29, 'Can add my sub category', 8, 'add_mysubcategory'),
(30, 'Can change my sub category', 8, 'change_mysubcategory'),
(31, 'Can delete my sub category', 8, 'delete_mysubcategory'),
(32, 'Can view my sub category', 8, 'view_mysubcategory'),
(33, 'Can add sub category', 9, 'add_subcategory'),
(34, 'Can change sub category', 9, 'change_subcategory'),
(35, 'Can delete sub category', 9, 'delete_subcategory'),
(36, 'Can view sub category', 9, 'view_subcategory'),
(37, 'Can add brands', 10, 'add_brands'),
(38, 'Can change brands', 10, 'change_brands'),
(39, 'Can delete brands', 10, 'delete_brands'),
(40, 'Can view brands', 10, 'view_brands'),
(41, 'Can add product', 11, 'add_product'),
(42, 'Can change product', 11, 'change_product'),
(43, 'Can delete product', 11, 'delete_product'),
(44, 'Can view product', 11, 'view_product'),
(45, 'Can add product details', 12, 'add_productdetails'),
(46, 'Can change product details', 12, 'change_productdetails'),
(47, 'Can delete product details', 12, 'delete_productdetails'),
(48, 'Can view product details', 12, 'view_productdetails'),
(49, 'Can add admin login', 13, 'add_adminlogin'),
(50, 'Can change admin login', 13, 'change_adminlogin'),
(51, 'Can delete admin login', 13, 'delete_adminlogin'),
(52, 'Can view admin login', 13, 'view_adminlogin'),
(53, 'Can add banner', 14, 'add_banner'),
(54, 'Can change banner', 14, 'change_banner'),
(55, 'Can delete banner', 14, 'delete_banner'),
(56, 'Can view banner', 14, 'view_banner'),
(57, 'Can add sign up', 15, 'add_signup'),
(58, 'Can change sign up', 15, 'change_signup'),
(59, 'Can delete sign up', 15, 'delete_signup'),
(60, 'Can view sign up', 15, 'view_signup'),
(61, 'Can add user address', 16, 'add_useraddress'),
(62, 'Can change user address', 16, 'change_useraddress'),
(63, 'Can delete user address', 16, 'delete_useraddress'),
(64, 'Can view user address', 16, 'view_useraddress');

-- --------------------------------------------------------

--
-- Table structure for table `auth_user`
--

CREATE TABLE `auth_user` (
  `id` int(11) NOT NULL,
  `password` varchar(128) NOT NULL,
  `last_login` datetime(6) DEFAULT NULL,
  `is_superuser` tinyint(1) NOT NULL,
  `username` varchar(150) NOT NULL,
  `first_name` varchar(150) NOT NULL,
  `last_name` varchar(150) NOT NULL,
  `email` varchar(254) NOT NULL,
  `is_staff` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `date_joined` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auth_user_groups`
--

CREATE TABLE `auth_user_groups` (
  `id` bigint(20) NOT NULL,
  `user_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auth_user_user_permissions`
--

CREATE TABLE `auth_user_user_permissions` (
  `id` bigint(20) NOT NULL,
  `user_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `django_admin_log`
--

CREATE TABLE `django_admin_log` (
  `id` int(11) NOT NULL,
  `action_time` datetime(6) NOT NULL,
  `object_id` longtext DEFAULT NULL,
  `object_repr` varchar(200) NOT NULL,
  `action_flag` smallint(5) UNSIGNED NOT NULL CHECK (`action_flag` >= 0),
  `change_message` longtext NOT NULL,
  `content_type_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `django_content_type`
--

CREATE TABLE `django_content_type` (
  `id` int(11) NOT NULL,
  `app_label` varchar(100) NOT NULL,
  `model` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `django_content_type`
--

INSERT INTO `django_content_type` (`id`, `app_label`, `model`) VALUES
(1, 'admin', 'logentry'),
(3, 'auth', 'group'),
(2, 'auth', 'permission'),
(4, 'auth', 'user'),
(5, 'contenttypes', 'contenttype'),
(6, 'sessions', 'session'),
(13, 'sevenshadesapp', 'adminlogin'),
(14, 'sevenshadesapp', 'banner'),
(10, 'sevenshadesapp', 'brands'),
(7, 'sevenshadesapp', 'maincategory'),
(8, 'sevenshadesapp', 'mysubcategory'),
(11, 'sevenshadesapp', 'product'),
(12, 'sevenshadesapp', 'productdetails'),
(15, 'sevenshadesapp', 'signup'),
(9, 'sevenshadesapp', 'subcategory'),
(16, 'sevenshadesapp', 'useraddress');

-- --------------------------------------------------------

--
-- Table structure for table `django_migrations`
--

CREATE TABLE `django_migrations` (
  `id` bigint(20) NOT NULL,
  `app` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `applied` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `django_migrations`
--

INSERT INTO `django_migrations` (`id`, `app`, `name`, `applied`) VALUES
(1, 'contenttypes', '0001_initial', '2024-03-28 06:07:26.341961'),
(2, 'auth', '0001_initial', '2024-03-28 06:07:26.757280'),
(3, 'admin', '0001_initial', '2024-03-28 06:07:26.855462'),
(4, 'admin', '0002_logentry_remove_auto_add', '2024-03-28 06:07:26.863611'),
(5, 'admin', '0003_logentry_add_action_flag_choices', '2024-03-28 06:07:26.873376'),
(6, 'contenttypes', '0002_remove_content_type_name', '2024-03-28 06:07:26.930408'),
(7, 'auth', '0002_alter_permission_name_max_length', '2024-03-28 06:07:26.979624'),
(8, 'auth', '0003_alter_user_email_max_length', '2024-03-28 06:07:26.992665'),
(9, 'auth', '0004_alter_user_username_opts', '2024-03-28 06:07:26.999260'),
(10, 'auth', '0005_alter_user_last_login_null', '2024-03-28 06:07:27.045265'),
(11, 'auth', '0006_require_contenttypes_0002', '2024-03-28 06:07:27.047275'),
(12, 'auth', '0007_alter_validators_add_error_messages', '2024-03-28 06:07:27.054563'),
(13, 'auth', '0008_alter_user_username_max_length', '2024-03-28 06:07:27.067589'),
(14, 'auth', '0009_alter_user_last_name_max_length', '2024-03-28 06:07:27.081146'),
(15, 'auth', '0010_alter_group_name_max_length', '2024-03-28 06:07:27.096032'),
(16, 'auth', '0011_update_proxy_permissions', '2024-03-28 06:07:27.108053'),
(17, 'auth', '0012_alter_user_first_name_max_length', '2024-03-28 06:07:27.122051'),
(18, 'sessions', '0001_initial', '2024-03-28 06:07:27.148934'),
(19, 'sevenshadesapp', '0001_initial', '2024-03-28 06:07:27.158688'),
(20, 'sevenshadesapp', '0002_alter_maincategory_icon', '2024-03-28 06:07:27.187343'),
(21, 'sevenshadesapp', '0003_rename_maincategory_maincategory_maincategoryname', '2024-03-28 06:07:27.196789'),
(22, 'sevenshadesapp', '0004_mysubcategory_subcategory', '2024-03-28 06:07:27.293761'),
(23, 'sevenshadesapp', '0002_initial', '2024-03-29 08:50:55.171735'),
(24, 'sevenshadesapp', '0003_product', '2024-03-29 16:31:23.138044'),
(25, 'sevenshadesapp', '0004_rename_mysubcategoryid_product_subcategoryid', '2024-03-29 17:00:32.549084'),
(26, 'sevenshadesapp', '0005_productdetails', '2024-03-31 11:10:05.237558'),
(27, 'sevenshadesapp', '0006_rename_productdid_productdetails_productid', '2024-04-01 08:38:07.855514'),
(28, 'sevenshadesapp', '0007_alter_productdetails_offerprice_and_more', '2024-04-01 18:35:46.897110'),
(29, 'sevenshadesapp', '0008_alter_productdetails_offerprice_and_more', '2024-04-01 18:37:54.341881'),
(30, 'sevenshadesapp', '0009_alter_productdetails_icon', '2024-04-02 17:12:02.019255'),
(31, 'sevenshadesapp', '0010_adminlogin', '2024-04-02 18:17:46.331301'),
(32, 'sevenshadesapp', '0011_banner', '2024-04-03 08:36:41.561253'),
(33, 'sevenshadesapp', '0012_remove_banner_pictures_banner_icon', '2024-04-14 06:23:44.428087'),
(34, 'sevenshadesapp', '0013_signup', '2024-06-21 05:41:24.677374'),
(35, 'sevenshadesapp', '0014_remove_signup_id_signup_mobileno_and_more', '2024-07-02 11:33:52.389125');

-- --------------------------------------------------------

--
-- Table structure for table `django_session`
--

CREATE TABLE `django_session` (
  `session_key` varchar(40) NOT NULL,
  `session_data` longtext NOT NULL,
  `expire_date` datetime(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sevenshadesapp_adminlogin`
--

CREATE TABLE `sevenshadesapp_adminlogin` (
  `id` bigint(20) NOT NULL,
  `emailid` varchar(70) NOT NULL,
  `mobileno` varchar(70) NOT NULL,
  `adminname` varchar(70) NOT NULL,
  `password` varchar(70) NOT NULL,
  `picture` varchar(70) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sevenshadesapp_adminlogin`
--

-- Passwords are redacted. This legacy dump previously carried plaintext values.
-- The live application stores only hashes (see migration 0023_hash_account_passwords);
-- set a real password through the app instead of restoring one from here.
INSERT INTO `sevenshadesapp_adminlogin` (`id`, `emailid`, `mobileno`, `adminname`, `password`, `picture`) VALUES
(1, 'ss@gmail.com', '9826208618', 'harry singh', 'REDACTED', '1.2jpg'),
(2, 'kk@gmail.com', '9826208518', 'karan singh', 'REDACTED', '1.3.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `sevenshadesapp_banner`
--

CREATE TABLE `sevenshadesapp_banner` (
  `id` bigint(20) NOT NULL,
  `bannerdescription` varchar(70) NOT NULL,
  `icon` longtext NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sevenshadesapp_banner`
--

INSERT INTO `sevenshadesapp_banner` (`id`, `bannerdescription`, `icon`) VALUES
(2, '', '1.avif,2.avif,3.avif,4.avif,18.png'),
(3, '', 'DSCN0457.JPG,DSCN0458.JPG,DSCN0463.JPG,DSCN0464.JPG,DSCN0465.JPG');

-- --------------------------------------------------------

--
-- Table structure for table `sevenshadesapp_brands`
--

CREATE TABLE `sevenshadesapp_brands` (
  `id` bigint(20) NOT NULL,
  `brandname` varchar(70) NOT NULL,
  `icon` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sevenshadesapp_brands`
--

INSERT INTO `sevenshadesapp_brands` (`id`, `brandname`, `icon`) VALUES
(5, 'Rare Rabbit', 'static/rr.png'),
(6, 'Nike', 'static/nike.png'),
(7, 'Lee', 'static/lee.png'),
(8, 'Puma', 'static/puma1.png'),
(9, 'H&M', 'static/hm.png'),
(11, 'Pepe Jeans', 'static/pepe.png'),
(13, 'Reebok', 'static/reebok.png'),
(14, 'Red Tape', 'static/red_tape.png'),
(16, 'dddd', 'static/WhatsApp_Image_2024-07-07_at_16.14.21_15be78f8_322vrnJ.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `sevenshadesapp_maincategory`
--

CREATE TABLE `sevenshadesapp_maincategory` (
  `id` bigint(20) NOT NULL,
  `maincategoryname` varchar(70) NOT NULL,
  `icon` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sevenshadesapp_maincategory`
--

INSERT INTO `sevenshadesapp_maincategory` (`id`, `maincategoryname`, `icon`) VALUES
(4, 'Women', 'static/women.png'),
(5, 'Men', 'static/men.png');

-- --------------------------------------------------------

--
-- Table structure for table `sevenshadesapp_mysubcategory`
--

CREATE TABLE `sevenshadesapp_mysubcategory` (
  `id` bigint(20) NOT NULL,
  `subcategoryname` varchar(70) NOT NULL,
  `icon` varchar(100) NOT NULL,
  `maincategoryid_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sevenshadesapp_mysubcategory`
--

INSERT INTO `sevenshadesapp_mysubcategory` (`id`, `subcategoryname`, `icon`, `maincategoryid_id`) VALUES
(7, 'Shirts', 'static/103.webp', 5),
(8, 'shoes', 'static/shoes.png', 5),
(9, 'Baggy Jeans', 'static/baggy_q1QqnWE.png', 5),
(10, 'Oversized T-shirts', 'static/oversized.png', 5),
(11, 'Shorts', 'static/shorts.png', 5),
(12, 'Western Dress', 'static/western_dress.png', 4),
(13, 'Kurti\'s', 'static/Kurti.png', 4),
(15, 'Boots', 'static/Boots.png', 4),
(16, 'Tops', 'static/top.png', 4);

-- --------------------------------------------------------

--
-- Table structure for table `sevenshadesapp_product`
--

CREATE TABLE `sevenshadesapp_product` (
  `id` bigint(20) NOT NULL,
  `productname` varchar(70) NOT NULL,
  `description` varchar(150) NOT NULL,
  `icon` varchar(100) NOT NULL,
  `brandid_id` bigint(20) NOT NULL,
  `maincategoryid_id` bigint(20) NOT NULL,
  `subcategoryid_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sevenshadesapp_product`
--

INSERT INTO `sevenshadesapp_product` (`id`, `productname`, `description`, `icon`, `brandid_id`, `maincategoryid_id`, `subcategoryid_id`) VALUES
(5, 'Silk Touch Shirts', 'Silk Touch Shirts', 'static/rr1.webp', 5, 5, 7),
(6, 'Printed Shirts', 'Printed Shirts', 'static/rr2.webp', 5, 5, 7),
(9, 'H&M jeans', 'H&M jeans', 'static/hm3.jpeg', 9, 5, 7),
(10, 'H&M T-shirts', 'H&M T-shirts', 'static/hm2.webp', 9, 5, 7),
(12, 'Nike Court Vision', 'Nike Court Vision', 'static/nike2.png', 6, 5, 8),
(13, 'Nike City Rep', 'Nike City Rep', 'static/nike1.png', 6, 5, 8),
(14, 'Puma Soft Ride Shoes', 'Puma Soft Ride Shoes', 'static/puma2.webp', 8, 5, 8),
(15, 'Puma Men Grey Shoes', 'Puma Men Grey Shoes', 'static/puma1.webp', 8, 5, 8),
(18, 'Nike Sportswear Men\'s T-Shirt. Nike JP', 'Nike Sportswear Men\'s T-Shirt. Nike JP', 'static/nike3.png', 6, 5, 10),
(20, 'Puma men\'s running shirt, gym shirt', 'Puma men\'s running shirt, gym shirt', 'static/puma3.jpg', 8, 5, 10),
(21, 'Puma Tracksuit', 'Puma Tracksuit', 'static/puma4.jpg', 8, 5, 10),
(22, 'boots', 'boots', 'static/Boots_CidJb16.png', 7, 4, 12);

-- --------------------------------------------------------

--
-- Table structure for table `sevenshadesapp_productdetails`
--

CREATE TABLE `sevenshadesapp_productdetails` (
  `id` bigint(20) NOT NULL,
  `productsubname` varchar(70) NOT NULL,
  `description` varchar(150) NOT NULL,
  `qty` int(11) NOT NULL,
  `price` int(11) NOT NULL,
  `color` varchar(70) NOT NULL,
  `size` varchar(70) NOT NULL,
  `offerprice` int(11) NOT NULL,
  `offertype` varchar(70) NOT NULL,
  `icon` longtext NOT NULL,
  `brandid_id` bigint(20) NOT NULL,
  `maincategoryid_id` bigint(20) NOT NULL,
  `productid_id` bigint(20) NOT NULL,
  `subcategoryid_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sevenshadesapp_productdetails`
--

INSERT INTO `sevenshadesapp_productdetails` (`id`, `productsubname`, `description`, `qty`, `price`, `color`, `size`, `offerprice`, `offertype`, `icon`, `brandid_id`, `maincategoryid_id`, `productid_id`, `subcategoryid_id`) VALUES
(7, 'dcvfd', 'csfd', 2, 34, 'red', 'xl', 234, 'vbsf', '42.png,43.png,44.png,45.png,46.png', 5, 5, 5, 7),
(8, 'heavy shirt', 'awesome shirt', 1, 500, 'red', 'medium', 450, 'diwali', '204689940-2.webp,205524038-2.webp,205533307-2.webp,205533316-2.webp,205574329-2.webp', 5, 5, 6, 7);

-- --------------------------------------------------------

--
-- Table structure for table `sevenshadesapp_signup`
--

CREATE TABLE `sevenshadesapp_signup` (
  `fname` varchar(70) NOT NULL,
  `lname` varchar(70) NOT NULL,
  `emailid` varchar(70) NOT NULL,
  `password` varchar(70) NOT NULL,
  `mobileno` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sevenshadesapp_signup`
--

-- Passwords are redacted; see the note on the adminlogin insert above.
INSERT INTO `sevenshadesapp_signup` (`fname`, `lname`, `emailid`, `password`, `mobileno`) VALUES
('sumit', 'singh', 'examples@gmail.com', 'REDACTED', '454575735'),
('sumit', 'singh', 'sumit@gmail.com', 'REDACTED', '8319651630'),
('ansh', 'singh', 'example@gmail.com', 'REDACTED', '8319651640');

-- --------------------------------------------------------

--
-- Table structure for table `sevenshadesapp_subcategory`
--

CREATE TABLE `sevenshadesapp_subcategory` (
  `id` bigint(20) NOT NULL,
  `subcategoryname` varchar(70) NOT NULL,
  `icon` varchar(100) NOT NULL,
  `categoryid_id` bigint(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sevenshadesapp_useraddress`
--

CREATE TABLE `sevenshadesapp_useraddress` (
  `id` bigint(20) NOT NULL,
  `country` varchar(70) NOT NULL,
  `address` varchar(70) NOT NULL,
  `city` varchar(70) NOT NULL,
  `postcode` varchar(70) NOT NULL,
  `mobileno_id` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `sevenshadesapp_useraddress`
--

INSERT INTO `sevenshadesapp_useraddress` (`id`, `country`, `address`, `city`, `postcode`, `mobileno_id`) VALUES
(20, 'India', 'dfbsd', 'gwalior', '474001', '8319651640'),
(22, 'india', 'govindpuri', 'jhansi', '456457', '8319651630'),
(24, 'fgbgbssf', 'fsf', 'ffds', '34534', '8319651630'),
(25, '', '', '', '', '8319651640'),
(26, 'India', 'ramnagar, hajira', 'gwalior', '333', '8319651640');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `auth_group`
--
ALTER TABLE `auth_group`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `auth_group_permissions`
--
ALTER TABLE `auth_group_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_group_permissions_group_id_permission_id_0cd325b0_uniq` (`group_id`,`permission_id`),
  ADD KEY `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` (`permission_id`);

--
-- Indexes for table `auth_permission`
--
ALTER TABLE `auth_permission`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_permission_content_type_id_codename_01ab375a_uniq` (`content_type_id`,`codename`);

--
-- Indexes for table `auth_user`
--
ALTER TABLE `auth_user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `auth_user_groups`
--
ALTER TABLE `auth_user_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_user_groups_user_id_group_id_94350c0c_uniq` (`user_id`,`group_id`),
  ADD KEY `auth_user_groups_group_id_97559544_fk_auth_group_id` (`group_id`);

--
-- Indexes for table `auth_user_user_permissions`
--
ALTER TABLE `auth_user_user_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `auth_user_user_permissions_user_id_permission_id_14a6b632_uniq` (`user_id`,`permission_id`),
  ADD KEY `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` (`permission_id`);

--
-- Indexes for table `django_admin_log`
--
ALTER TABLE `django_admin_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `django_admin_log_content_type_id_c4bce8eb_fk_django_co` (`content_type_id`),
  ADD KEY `django_admin_log_user_id_c564eba6_fk_auth_user_id` (`user_id`);

--
-- Indexes for table `django_content_type`
--
ALTER TABLE `django_content_type`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `django_content_type_app_label_model_76bd3d3b_uniq` (`app_label`,`model`);

--
-- Indexes for table `django_migrations`
--
ALTER TABLE `django_migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `django_session`
--
ALTER TABLE `django_session`
  ADD PRIMARY KEY (`session_key`),
  ADD KEY `django_session_expire_date_a5c62663` (`expire_date`);

--
-- Indexes for table `sevenshadesapp_adminlogin`
--
ALTER TABLE `sevenshadesapp_adminlogin`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `emailid` (`emailid`),
  ADD UNIQUE KEY `mobileno` (`mobileno`);

--
-- Indexes for table `sevenshadesapp_banner`
--
ALTER TABLE `sevenshadesapp_banner`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sevenshadesapp_brands`
--
ALTER TABLE `sevenshadesapp_brands`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sevenshadesapp_maincategory`
--
ALTER TABLE `sevenshadesapp_maincategory`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sevenshadesapp_mysubcategory`
--
ALTER TABLE `sevenshadesapp_mysubcategory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sevenshadesapp_mysub_maincategoryid_id_39cd81bf_fk_sevenshad` (`maincategoryid_id`);

--
-- Indexes for table `sevenshadesapp_product`
--
ALTER TABLE `sevenshadesapp_product`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sevenshadesapp_produ_brandid_id_6192c89f_fk_sevenshad` (`brandid_id`),
  ADD KEY `sevenshadesapp_produ_maincategoryid_id_e7f89edb_fk_sevenshad` (`maincategoryid_id`),
  ADD KEY `sevenshadesapp_produ_subcategoryid_id_05848183_fk_sevenshad` (`subcategoryid_id`);

--
-- Indexes for table `sevenshadesapp_productdetails`
--
ALTER TABLE `sevenshadesapp_productdetails`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sevenshadesapp_produ_brandid_id_826e1dc4_fk_sevenshad` (`brandid_id`),
  ADD KEY `sevenshadesapp_produ_maincategoryid_id_3822b699_fk_sevenshad` (`maincategoryid_id`),
  ADD KEY `sevenshadesapp_produ_subcategoryid_id_ca52fc89_fk_sevenshad` (`subcategoryid_id`),
  ADD KEY `sevenshadesapp_produ_productid_id_0e71c20a_fk_sevenshad` (`productid_id`);

--
-- Indexes for table `sevenshadesapp_signup`
--
ALTER TABLE `sevenshadesapp_signup`
  ADD PRIMARY KEY (`mobileno`),
  ADD UNIQUE KEY `sevenshadesapp_signup_emailid_a8c81e22_uniq` (`emailid`);

--
-- Indexes for table `sevenshadesapp_subcategory`
--
ALTER TABLE `sevenshadesapp_subcategory`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sevenshadesapp_subca_categoryid_id_0ef0c19e_fk_sevenshad` (`categoryid_id`);

--
-- Indexes for table `sevenshadesapp_useraddress`
--
ALTER TABLE `sevenshadesapp_useraddress`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sevenshadesapp_usera_mobileno_id_03c428e6_fk_sevenshad` (`mobileno_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `auth_group`
--
ALTER TABLE `auth_group`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `auth_group_permissions`
--
ALTER TABLE `auth_group_permissions`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `auth_permission`
--
ALTER TABLE `auth_permission`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;

--
-- AUTO_INCREMENT for table `auth_user`
--
ALTER TABLE `auth_user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `auth_user_groups`
--
ALTER TABLE `auth_user_groups`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `auth_user_user_permissions`
--
ALTER TABLE `auth_user_user_permissions`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `django_admin_log`
--
ALTER TABLE `django_admin_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `django_content_type`
--
ALTER TABLE `django_content_type`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `django_migrations`
--
ALTER TABLE `django_migrations`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `sevenshadesapp_adminlogin`
--
ALTER TABLE `sevenshadesapp_adminlogin`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `sevenshadesapp_banner`
--
ALTER TABLE `sevenshadesapp_banner`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `sevenshadesapp_brands`
--
ALTER TABLE `sevenshadesapp_brands`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `sevenshadesapp_maincategory`
--
ALTER TABLE `sevenshadesapp_maincategory`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `sevenshadesapp_mysubcategory`
--
ALTER TABLE `sevenshadesapp_mysubcategory`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `sevenshadesapp_product`
--
ALTER TABLE `sevenshadesapp_product`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `sevenshadesapp_productdetails`
--
ALTER TABLE `sevenshadesapp_productdetails`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `sevenshadesapp_subcategory`
--
ALTER TABLE `sevenshadesapp_subcategory`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sevenshadesapp_useraddress`
--
ALTER TABLE `sevenshadesapp_useraddress`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `auth_group_permissions`
--
ALTER TABLE `auth_group_permissions`
  ADD CONSTRAINT `auth_group_permissio_permission_id_84c5c92e_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  ADD CONSTRAINT `auth_group_permissions_group_id_b120cbf9_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`);

--
-- Constraints for table `auth_permission`
--
ALTER TABLE `auth_permission`
  ADD CONSTRAINT `auth_permission_content_type_id_2f476e4b_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`);

--
-- Constraints for table `auth_user_groups`
--
ALTER TABLE `auth_user_groups`
  ADD CONSTRAINT `auth_user_groups_group_id_97559544_fk_auth_group_id` FOREIGN KEY (`group_id`) REFERENCES `auth_group` (`id`),
  ADD CONSTRAINT `auth_user_groups_user_id_6a12ed8b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);

--
-- Constraints for table `auth_user_user_permissions`
--
ALTER TABLE `auth_user_user_permissions`
  ADD CONSTRAINT `auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission` (`id`),
  ADD CONSTRAINT `auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);

--
-- Constraints for table `django_admin_log`
--
ALTER TABLE `django_admin_log`
  ADD CONSTRAINT `django_admin_log_content_type_id_c4bce8eb_fk_django_co` FOREIGN KEY (`content_type_id`) REFERENCES `django_content_type` (`id`),
  ADD CONSTRAINT `django_admin_log_user_id_c564eba6_fk_auth_user_id` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`);

--
-- Constraints for table `sevenshadesapp_mysubcategory`
--
ALTER TABLE `sevenshadesapp_mysubcategory`
  ADD CONSTRAINT `sevenshadesapp_mysub_maincategoryid_id_39cd81bf_fk_sevenshad` FOREIGN KEY (`maincategoryid_id`) REFERENCES `sevenshadesapp_maincategory` (`id`);

--
-- Constraints for table `sevenshadesapp_product`
--
ALTER TABLE `sevenshadesapp_product`
  ADD CONSTRAINT `sevenshadesapp_produ_brandid_id_6192c89f_fk_sevenshad` FOREIGN KEY (`brandid_id`) REFERENCES `sevenshadesapp_brands` (`id`),
  ADD CONSTRAINT `sevenshadesapp_produ_maincategoryid_id_e7f89edb_fk_sevenshad` FOREIGN KEY (`maincategoryid_id`) REFERENCES `sevenshadesapp_maincategory` (`id`),
  ADD CONSTRAINT `sevenshadesapp_produ_subcategoryid_id_05848183_fk_sevenshad` FOREIGN KEY (`subcategoryid_id`) REFERENCES `sevenshadesapp_mysubcategory` (`id`);

--
-- Constraints for table `sevenshadesapp_productdetails`
--
ALTER TABLE `sevenshadesapp_productdetails`
  ADD CONSTRAINT `sevenshadesapp_produ_brandid_id_826e1dc4_fk_sevenshad` FOREIGN KEY (`brandid_id`) REFERENCES `sevenshadesapp_brands` (`id`),
  ADD CONSTRAINT `sevenshadesapp_produ_maincategoryid_id_3822b699_fk_sevenshad` FOREIGN KEY (`maincategoryid_id`) REFERENCES `sevenshadesapp_maincategory` (`id`),
  ADD CONSTRAINT `sevenshadesapp_produ_productid_id_0e71c20a_fk_sevenshad` FOREIGN KEY (`productid_id`) REFERENCES `sevenshadesapp_product` (`id`),
  ADD CONSTRAINT `sevenshadesapp_produ_subcategoryid_id_ca52fc89_fk_sevenshad` FOREIGN KEY (`subcategoryid_id`) REFERENCES `sevenshadesapp_mysubcategory` (`id`);

--
-- Constraints for table `sevenshadesapp_subcategory`
--
ALTER TABLE `sevenshadesapp_subcategory`
  ADD CONSTRAINT `sevenshadesapp_subca_categoryid_id_0ef0c19e_fk_sevenshad` FOREIGN KEY (`categoryid_id`) REFERENCES `sevenshadesapp_maincategory` (`id`);

--
-- Constraints for table `sevenshadesapp_useraddress`
--
ALTER TABLE `sevenshadesapp_useraddress`
  ADD CONSTRAINT `sevenshadesapp_usera_mobileno_id_03c428e6_fk_sevenshad` FOREIGN KEY (`mobileno_id`) REFERENCES `sevenshadesapp_signup` (`mobileno`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
