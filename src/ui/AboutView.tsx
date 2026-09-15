import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { type Locale, messages } from "../i18n";

interface Props {
  headingId: string;
  locale: Locale;
}

function AboutList({ items }: { items: string[] }) {
  return (
    <List>
      {items.map((item) => (
        <ListItem key={item} sx={{ alignItems: "flex-start" }}>
          <ListItemText primary={item} />
        </ListItem>
      ))}
    </List>
  );
}

/** 初めて遊ぶ人が、遊び方と安全性を短時間で把握できる情報だけを示す。 */
export function AboutView({ headingId, locale }: Props) {
  const copy = messages[locale];
  return (
    <Paper
      component="section"
      className="panel"
      aria-labelledby={headingId}
      variant="outlined"
    >
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography id={headingId} variant="h4" component="h2">
            {copy.about}
          </Typography>
          <Typography color="text.secondary">{copy.aboutBody}</Typography>
        </Stack>

        <section>
          <Typography variant="h6" component="h3">
            {copy.aboutPlayTitle}
          </Typography>
          <AboutList
            items={[
              copy.aboutPlayChoose,
              copy.aboutPlayObserve,
              copy.aboutPlaySupport,
            ]}
          />
        </section>

        <section>
          <Typography variant="h6" component="h3">
            {copy.aboutSafetyTitle}
          </Typography>
          <AboutList
            items={[
              copy.aboutSafetyPermission,
              copy.aboutSafetyLocal,
              copy.aboutSafetySecurity,
            ]}
          />
        </section>

        <section>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            {copy.relatedDocuments}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 2 }}>
            <Link href={`./privacy/index.html?locale=${locale}`}>
              {copy.privacyPolicy}
            </Link>
            <Link href={`./terms/index.html?locale=${locale}`}>
              {copy.termsOfService}
            </Link>
            <Link href={`./licenses/index.html?locale=${locale}`}>
              {copy.thirdPartyLicenses}
            </Link>
          </Stack>
        </section>
      </Stack>
    </Paper>
  );
}
