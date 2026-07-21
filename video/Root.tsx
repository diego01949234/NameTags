import { Composition } from "remotion";
import { NameTagsFilm } from "./NameTagsFilm";

const FILM_SECONDS = 50;

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="NameTagsFilm"
        component={NameTagsFilm}
        durationInFrames={FILM_SECONDS * 60}
        fps={60}
        width={3840}
        height={2160}
      />
      <Composition
        id="NameTagsFilmPreview"
        component={NameTagsFilm}
        durationInFrames={FILM_SECONDS * 30}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
