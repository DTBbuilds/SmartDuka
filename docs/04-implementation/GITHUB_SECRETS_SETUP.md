# GitHub Secrets Setup for Android APK Releases

This guide walks you through creating and configuring the GitHub secrets needed for automated Android APK builds and releases.

## Required Secrets

| Secret Name | Description |
|-------------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Password for the keystore |
| `ANDROID_KEY_ALIAS` | Alias of the key in the keystore |
| `ANDROID_KEY_PASSWORD` | Password for the key |

## Step 1: Create a Keystore

If you don't have a keystore yet, create one using `keytool`:

```bash
keytool -genkey -v -keystore smartduka-release.keystore \
  -alias smartduka \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_KEYSTORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=SmartDuka, OU=Development, O=SmartDuka, L=Nairobi, ST=Nairobi, C=KE"
```

**Important:** 
- Replace `YOUR_KEYSTORE_PASSWORD` and `YOUR_KEY_PASSWORD` with strong passwords
- Store the keystore file and passwords securely - you cannot recover them!
- The keystore is used to sign all future releases - losing it means you can't update the app

## Step 2: Convert Keystore to Base64

**On Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("smartduka-release.keystore")) | Out-File -FilePath keystore.base64 -Encoding ASCII
```

**On Linux/macOS:**
```bash
base64 -i smartduka-release.keystore > keystore.base64
```

The `keystore.base64` file now contains your keystore encoded as text.

## Step 3: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each secret:

### Secret 1: ANDROID_KEYSTORE_BASE64
- **Name:** `ANDROID_KEYSTORE_BASE64`
- **Value:** Copy the entire contents of `keystore.base64` file

### Secret 2: ANDROID_KEYSTORE_PASSWORD
- **Name:** `ANDROID_KEYSTORE_PASSWORD`
- **Value:** The password you used for `-storepass` (e.g., `YOUR_KEYSTORE_PASSWORD`)

### Secret 3: ANDROID_KEY_ALIAS
- **Name:** `ANDROID_KEY_ALIAS`
- **Value:** The alias you used (e.g., `smartduka`)

### Secret 4: ANDROID_KEY_PASSWORD
- **Name:** `ANDROID_KEY_PASSWORD`
- **Value:** The password you used for `-keypass` (e.g., `YOUR_KEY_PASSWORD`)

## Step 4: Verify Setup

After adding all secrets, your repository secrets page should show:

```
ANDROID_KEYSTORE_BASE64    Updated just now
ANDROID_KEYSTORE_PASSWORD  Updated just now
ANDROID_KEY_ALIAS          Updated just now
ANDROID_KEY_PASSWORD       Updated just now
```

## Step 5: Trigger a Build

Push a change to the `main` branch or manually trigger the workflow:

1. Go to **Actions** → **Build Android APK**
2. Click **Run workflow**
3. Select `main` branch
4. Click **Run workflow**

## Troubleshooting

### "Keystore file not found"
- Ensure `ANDROID_KEYSTORE_BASE64` is correctly base64 encoded
- Check that there are no extra newlines or spaces

### "Keystore password incorrect"
- Double-check `ANDROID_KEYSTORE_PASSWORD` matches what you used when creating the keystore

### "Key alias not found"
- Verify `ANDROID_KEY_ALIAS` matches the alias in the keystore
- List aliases: `keytool -list -keystore smartduka-release.keystore`

### "Key password incorrect"
- Ensure `ANDROID_KEY_PASSWORD` is correct
- Note: Key password can be the same as keystore password

## Security Best Practices

1. **Never commit the keystore file** to version control
2. **Keep a secure backup** of the keystore and passwords
3. **Use strong, unique passwords** for keystore and key
4. **Limit access** to repository secrets to trusted team members
5. **Rotate keys** periodically for high-security applications

## Quick Reference Commands

```bash
# Create new keystore
keytool -genkey -v -keystore smartduka-release.keystore -alias smartduka -keyalg RSA -keysize 2048 -validity 10000

# List keys in keystore
keytool -list -v -keystore smartduka-release.keystore

# Export certificate (for Google Play)
keytool -exportcert -keystore smartduka-release.keystore -alias smartduka -file smartduka.cer

# Get SHA-1 fingerprint (for Firebase/Google Services)
keytool -list -v -keystore smartduka-release.keystore -alias smartduka | grep SHA1
```

## Next Steps

Once secrets are configured:
1. Push to `main` to trigger automatic APK build
2. Check **Actions** tab for build progress
3. Download signed APK from **Releases** page
4. Distribute APK to users or upload to Google Play Store
