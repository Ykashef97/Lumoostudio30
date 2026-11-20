# How to create a new public link for the website

*Updated 20 November 2026 for the owners. No coding knowledge needed for Options A, C and D.*

The website is hosted free on **GitHub Pages**. GitHub builds the link from two names:

```
https://<github-account>.github.io/<project-name>/
```

Today that is `https://ykashef97.github.io/Lumoostudio30/`. To get a different link, change one of those two names, or connect your own domain.

## Which option to choose

| Option | New link looks like | Old link | Cost | Best when |
| --- | --- | --- | --- | --- |
| **A. New project on GitHub** | `ykashef97.github.io/lumadesign/` | Keeps working, shows the old site | Free | You want a new link and want to keep the old site as it is |
| **B. Same link, new version** | `ykashef97.github.io/Lumoostudio30/` | Same link, shows the new site | Free | You only want the new design live, the link does not matter |
| **C. Rename the project** | `ykashef97.github.io/lumadesign/` | Stops working | Free | You want one site only, with a better name |
| **D. Your own domain** | `www.your-brand.com` | Can stay or go | Yearly domain fee | You are ready to print the address on cards and ads |

Recommended path: **Option A now**, to get a clean LumaDesign link today. Add **Option D** when you have chosen a domain name.

The new version of the website is saved on GitHub in a copy called `refactor`, and since 14 November 2026 the current public link already shows it. The old version is in the copy called `main`. The steps below say which copy to use.

---

## Option A: a new project (new link, old site untouched)

You need to be signed in to GitHub as the account that should own the site.

1. Go to [github.com/new](https://github.com/new).
2. **Repository name:** type the name you want in the link, for example `lumadesign`. Use lowercase letters and dashes only.
3. Choose **Public**. Leave every tick box empty (no README, no .gitignore, no license).
4. Press **Create repository**. GitHub shows an empty project page. Keep it open.
5. Copy the new version into it. Choose one way:
   - **Ask Claude:** say "push the refactor branch to the new project `lumadesign` as main". Claude runs the two commands for you.
   - **Do it yourself:** open a terminal in the project folder and run these two lines, replacing the account and name with yours:

     ```
     git remote add newsite https://github.com/Ykashef97/lumadesign.git
     git push newsite refactor:main
     ```

6. On the new project page, open **Settings**, then **Pages** in the left menu.
7. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
8. Under **Branch**, choose **main** and **/ (root)**, then press **Save**.
9. Wait one or two minutes and refresh the page. GitHub shows "Your site is live at…" with the new link.
10. Finish with [After the link changes](#after-the-link-changes) below.

---

## Option B: same link, new version

Already done: the current link shows the `refactor` branch. Two ways to keep it that way:

- **Simplest:** keep pushing changes to `refactor`. In GitHub's **Settings → Pages**, the branch stays set to `refactor`.
- **Tidier, optional:** merge `refactor` into `main`, then set the Pages branch back to `main`, as below.

1. Open [github.com/Ykashef97/Lumoostudio30](https://github.com/Ykashef97/Lumoostudio30) while signed in.
2. Open the **Pull requests** tab and press **New pull request**.
3. Set **base** to `main` and **compare** to `refactor`.
4. Press **Create pull request**, then **Create pull request** again.
5. Press **Merge pull request**, then **Confirm merge**.
6. Wait one or two minutes, then open the link and press Ctrl+F5.

Nothing else is needed. The address inside the files already matches this link.

---

## Option C: rename the project

Do Option B first, so the new version is the one being shown.

1. Open the project on GitHub, then **Settings**.
2. At the top, under **Repository name**, type the new name, for example `lumadesign`, and press **Rename**.
3. Wait one or two minutes. The site is now at `https://ykashef97.github.io/lumadesign/`.
4. The old link stops working. Update it anywhere you shared it.
5. Finish with [After the link changes](#after-the-link-changes) below.

---

## Option D: your own domain

Works on top of Option A, B or C.

1. Buy a domain from any registrar (for example Namecheap, GoDaddy or Google Domains).
2. On GitHub, open the project, then **Settings**, then **Pages**.
3. Under **Custom domain**, type `www.your-brand.com` and press **Save**.
4. In your domain registrar's **DNS settings**, add these records:

   | Type | Name / Host | Value |
   | --- | --- | --- |
   | CNAME | `www` | `ykashef97.github.io` |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |

   If the site is under a different GitHub account, use that account name in the CNAME value.
5. Wait for GitHub to show a green tick next to the domain. This can take from a few minutes to 24 hours.
6. Tick **Enforce HTTPS** on the same page.
7. Finish with [After the link changes](#after-the-link-changes) below.

---

## After the link changes

The public address is written inside seven files, for search engines and for the preview picture that appears when the link is shared on WhatsApp or Facebook:

- `index.html`, `space.html`, `about.html`, `contact.html`
- `404.html`
- `robots.txt`
- `sitemap.xml`

They still say `ykashef97.github.io/Lumoostudio30`. The site works without this change, but link previews and search results will point to the old address.

The easy way: tell Claude "the new address is `https://…`" and it updates all seven and publishes them.

Then check:

- [ ] The new link opens on a phone and on a computer
- [ ] Sharing the link in WhatsApp shows the LumaDesign preview picture
- [ ] "Request a quote" opens WhatsApp with the message written
- [ ] A wrong address such as `…/abc` shows the "This page is in the dark" page

---

## Words used here

- **Repository (repo) / project:** the folder of website files stored on GitHub.
- **Branch:** a named copy of the files inside the project. `main` is the old site, `refactor` is the new one.
- **Commit:** saving a set of changes into the project's history.
- **Push:** uploading saved changes from a computer to GitHub.
- **GitHub Pages:** GitHub's free service that turns a project into a public website.
- **DNS:** the settings at your domain provider that tell the internet where your domain points.
