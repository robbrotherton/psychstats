library(ggplot2)

df <- tibble::tibble(x = seq(-10, 10, .2),
                     y = dnorm(x)) |> 
  dplyr::mutate(x = 200 * (x + 10) / 20,
                y = 38 - round(y * (1 / dnorm(0)) * 36, 5))

pairs <- paste(df$x, df$y, sep = ",")
cat(pairs)

# ggplot(df) +
#   geom_path(aes(x, y))

# ggsave("C:/Users/rober/Desktop/logo.svg")